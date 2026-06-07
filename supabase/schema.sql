-- ============================================================================
-- BRAINSTOMER · Schema del database (Supabase / PostgreSQL)
-- ----------------------------------------------------------------------------
-- Esegui questo file UNA VOLTA nel SQL Editor di Supabase
-- (Dashboard -> SQL Editor -> New query -> incolla tutto -> Run).
-- Crea tabelle, politiche di sicurezza (RLS), storage per le immagini e i
-- trigger per lo storico e l'approvazione a maggioranza dei miglioramenti.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILI UTENTE
-- Ogni utente registrato (auth.users) ha un profilo con nome visualizzato.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at  timestamptz not null default now()
);

-- Crea automaticamente un profilo quando si registra un nuovo utente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. IDEE DI PROGETTO
-- ----------------------------------------------------------------------------
create table if not exists public.ideas (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (char_length(title) between 3 and 140),
  description text not null default '',
  status      text not null default 'open'
              check (status in ('open', 'in_progress', 'shipped', 'archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists ideas_owner_idx on public.ideas(owner_id);

-- ----------------------------------------------------------------------------
-- 3. IMMAGINI ALLEGATE A UN'IDEA
-- Il file binario sta nello Storage; qui salviamo solo il percorso.
-- ----------------------------------------------------------------------------
create table if not exists public.idea_images (
  id           uuid primary key default gen_random_uuid(),
  idea_id      uuid not null references public.ideas(id) on delete cascade,
  storage_path text not null,
  caption      text default '',
  uploaded_by  uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create index if not exists idea_images_idea_idx on public.idea_images(idea_id);

-- ----------------------------------------------------------------------------
-- 4. VOTI SULLE IDEE (+1 positivo / -1 negativo) · un voto per utente
-- ----------------------------------------------------------------------------
create table if not exists public.idea_votes (
  idea_id    uuid not null references public.ideas(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  value      smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 5. PROPOSTE DI MIGLIORAMENTO
-- Approvate se la MAGGIORANZA vota a favore. In caso di pareggio decide
-- il proprietario dell'idea (campo resolved_by_owner).
-- ----------------------------------------------------------------------------
create table if not exists public.improvements (
  id          uuid primary key default gen_random_uuid(),
  idea_id     uuid not null references public.ideas(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (char_length(title) between 3 and 140),
  body        text not null default '',
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected')),
  resolved_by_owner boolean not null default false, -- true se sbloccato dal proprietario in pareggio
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists improvements_idea_idx on public.improvements(idea_id);

-- ----------------------------------------------------------------------------
-- 6. VOTI SULLE PROPOSTE DI MIGLIORAMENTO · un voto per utente
-- ----------------------------------------------------------------------------
create table if not exists public.improvement_votes (
  improvement_id uuid not null references public.improvements(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  value          smallint not null check (value in (-1, 1)),
  created_at     timestamptz not null default now(),
  primary key (improvement_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 7. STORICO / AUDIT LOG — traccia ogni evento dello sviluppo dell'idea
-- ----------------------------------------------------------------------------
create table if not exists public.history (
  id         uuid primary key default gen_random_uuid(),
  idea_id    uuid not null references public.ideas(id) on delete cascade,
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null,           -- es: 'idea_created', 'improvement_approved'
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists history_idea_idx on public.history(idea_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 8. PROTOTIPO — spazio per sviluppare un prototipo dell'app dentro l'idea.
-- Salviamo codice/markdown HTML che viene mostrato in anteprima live.
-- ----------------------------------------------------------------------------
create table if not exists public.prototypes (
  idea_id    uuid primary key references public.ideas(id) on delete cascade,
  content    text not null default '',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- LOGICA DI APPROVAZIONE A MAGGIORANZA
-- ----------------------------------------------------------------------------
-- Ricalcola lo stato di una proposta ogni volta che cambiano i suoi voti.
--   favorevoli > contrari  -> approved
--   contrari   > favorevoli -> rejected
--   pareggio                -> resta 'pending' (lo sblocca il proprietario)
-- Quando lo stato cambia, scrive una riga nello storico.
-- ============================================================================
create or replace function public.recompute_improvement_status(p_improvement_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_up    int;
  v_down  int;
  v_idea  uuid;
  v_old   text;
  v_new   text;
  v_title text;
begin
  select idea_id, status, title into v_idea, v_old, v_title
  from public.improvements where id = p_improvement_id;

  select
    coalesce(sum(case when value = 1 then 1 else 0 end), 0),
    coalesce(sum(case when value = -1 then 1 else 0 end), 0)
  into v_up, v_down
  from public.improvement_votes where improvement_id = p_improvement_id;

  if v_up > v_down then
    v_new := 'approved';
  elsif v_down > v_up then
    v_new := 'rejected';
  else
    v_new := 'pending'; -- pareggio: decide il proprietario
  end if;

  -- Non sovrascrivere una decisione presa manualmente dal proprietario.
  if (select resolved_by_owner from public.improvements where id = p_improvement_id) then
    return;
  end if;

  if v_new <> v_old then
    update public.improvements
      set status = v_new,
          resolved_at = case when v_new = 'pending' then null else now() end
      where id = p_improvement_id;

    insert into public.history (idea_id, actor_id, action, detail)
    values (v_idea, null,
      'improvement_' || v_new,
      jsonb_build_object('improvement_id', p_improvement_id, 'title', v_title,
                         'up', v_up, 'down', v_down));
  end if;
end;
$$;

-- Trigger: ad ogni inserimento/modifica/cancellazione di un voto, ricalcola.
create or replace function public.on_improvement_vote_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.recompute_improvement_status(
    coalesce(new.improvement_id, old.improvement_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_improvement_vote on public.improvement_votes;
create trigger trg_improvement_vote
  after insert or update or delete on public.improvement_votes
  for each row execute function public.on_improvement_vote_change();

-- Il proprietario sblocca un pareggio: forza approved/rejected.
create or replace function public.owner_resolve_improvement(
  p_improvement_id uuid, p_decision text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_idea  uuid;
  v_owner uuid;
  v_title text;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decisione non valida: %', p_decision;
  end if;

  select i.idea_id, d.owner_id, i.title
    into v_idea, v_owner, v_title
  from public.improvements i
  join public.ideas d on d.id = i.idea_id
  where i.id = p_improvement_id;

  if v_owner <> auth.uid() then
    raise exception 'Solo il proprietario dell''idea puo sbloccare un pareggio';
  end if;

  update public.improvements
    set status = p_decision, resolved_by_owner = true, resolved_at = now()
    where id = p_improvement_id;

  insert into public.history (idea_id, actor_id, action, detail)
  values (v_idea, auth.uid(), 'improvement_' || p_decision || '_by_owner',
    jsonb_build_object('improvement_id', p_improvement_id, 'title', v_title));
end;
$$;

-- ============================================================================
-- STORICO AUTOMATICO per creazione idee e proposte
-- ============================================================================
create or replace function public.log_idea_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.history (idea_id, actor_id, action, detail)
  values (new.id, new.owner_id, 'idea_created',
          jsonb_build_object('title', new.title));
  return new;
end; $$;

drop trigger if exists trg_idea_created on public.ideas;
create trigger trg_idea_created
  after insert on public.ideas
  for each row execute function public.log_idea_created();

create or replace function public.log_improvement_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.history (idea_id, actor_id, action, detail)
  values (new.idea_id, new.author_id, 'improvement_proposed',
          jsonb_build_object('improvement_id', new.id, 'title', new.title));
  return new;
end; $$;

drop trigger if exists trg_improvement_created on public.improvements;
create trigger trg_improvement_created
  after insert on public.improvements
  for each row execute function public.log_improvement_created();

create or replace function public.log_prototype_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.history (idea_id, actor_id, action, detail)
  values (new.idea_id, new.updated_by, 'prototype_updated', '{}'::jsonb);
  return new;
end; $$;

drop trigger if exists trg_prototype_update on public.prototypes;
create trigger trg_prototype_update
  after insert or update on public.prototypes
  for each row execute function public.log_prototype_update();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Regola generale: qualsiasi utente autenticato puo LEGGERE tutto (l'app e
-- collaborativa), ma puo creare/modificare/cancellare solo cio che e suo.
-- ============================================================================
alter table public.profiles          enable row level security;
alter table public.ideas             enable row level security;
alter table public.idea_images       enable row level security;
alter table public.idea_votes        enable row level security;
alter table public.improvements      enable row level security;
alter table public.improvement_votes enable row level security;
alter table public.history           enable row level security;
alter table public.prototypes        enable row level security;

-- PROFILI: lettura per tutti gli autenticati, ognuno modifica il proprio.
create policy "profiles_read"   on public.profiles for select to authenticated using (true);
create policy "profiles_update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- IDEE: lettura per tutti; crea/modifica/elimina solo il proprietario.
create policy "ideas_read"   on public.ideas for select to authenticated using (true);
create policy "ideas_insert" on public.ideas for insert to authenticated
  with check (owner_id = auth.uid());
create policy "ideas_update" on public.ideas for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "ideas_delete" on public.ideas for delete to authenticated
  using (owner_id = auth.uid());

-- IMMAGINI: lettura per tutti; carica chi e autenticato, cancella chi l'ha caricata o il proprietario dell'idea.
create policy "idea_images_read"   on public.idea_images for select to authenticated using (true);
create policy "idea_images_insert" on public.idea_images for insert to authenticated
  with check (uploaded_by = auth.uid());
create policy "idea_images_delete" on public.idea_images for delete to authenticated
  using (
    uploaded_by = auth.uid()
    or exists (select 1 from public.ideas i where i.id = idea_id and i.owner_id = auth.uid())
  );

-- VOTI IDEE: lettura per tutti; ognuno gestisce solo il proprio voto.
create policy "idea_votes_read"   on public.idea_votes for select to authenticated using (true);
create policy "idea_votes_write"  on public.idea_votes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- MIGLIORAMENTI: lettura per tutti; crea chi e autenticato; lo stato lo cambiano i trigger/funzioni.
create policy "improvements_read"   on public.improvements for select to authenticated using (true);
create policy "improvements_insert" on public.improvements for insert to authenticated
  with check (author_id = auth.uid());

-- VOTI MIGLIORAMENTI: lettura per tutti; ognuno gestisce solo il proprio voto.
create policy "improvement_votes_read"  on public.improvement_votes for select to authenticated using (true);
create policy "improvement_votes_write" on public.improvement_votes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- STORICO: sola lettura per tutti (lo scrivono i trigger con security definer).
create policy "history_read" on public.history for select to authenticated using (true);

-- PROTOTIPO: lettura per tutti; modifica chi e autenticato (sviluppo collaborativo).
create policy "prototypes_read"  on public.prototypes for select to authenticated using (true);
create policy "prototypes_write" on public.prototypes for all to authenticated
  using (true) with check (updated_by = auth.uid());

-- ============================================================================
-- STORAGE per le immagini delle idee
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('idea-images', 'idea-images', true)
on conflict (id) do nothing;

create policy "idea_images_storage_read" on storage.objects for select
  using (bucket_id = 'idea-images');
create policy "idea_images_storage_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'idea-images');
create policy "idea_images_storage_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'idea-images' and owner = auth.uid());

-- ============================================================================
-- VISTE comode: conteggio voti per idea
-- ============================================================================
create or replace view public.idea_vote_counts as
select
  i.id as idea_id,
  coalesce(sum(case when v.value = 1 then 1 else 0 end), 0)  as upvotes,
  coalesce(sum(case when v.value = -1 then 1 else 0 end), 0) as downvotes,
  coalesce(sum(v.value), 0) as score
from public.ideas i
left join public.idea_votes v on v.idea_id = i.id
group by i.id;

-- Fine schema.
