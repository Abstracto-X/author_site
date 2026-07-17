-- Story-agnostic, chapter-checkpointed LitRPG system panels.

create table if not exists public.story_systems (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null unique references public.stories(id) on delete cascade,
  name text not null default 'System',
  is_enabled boolean not null default true,
  appearance jsonb not null default '{"default":{"preset":"circuit","accent":"#5ee7ff","font":"tech"},"pages":{}}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_systems_appearance_object check (jsonb_typeof(appearance) = 'object')
);

create table if not exists public.story_system_versions (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.story_systems(id) on delete cascade,
  version_number integer not null,
  name text not null default 'System version',
  activation_after_chapter_id uuid references public.chapters(id) on delete set null,
  definition jsonb not null default '{"startPageId":"status","pages":[]}'::jsonb,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(system_id, version_number),
  constraint story_system_versions_definition_object check (jsonb_typeof(definition) = 'object')
);

create table if not exists public.story_system_checkpoints (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.story_systems(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  version_id uuid not null references public.story_system_versions(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  state jsonb not null default '{"values":{}}'::jsonb,
  change_set jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint story_system_checkpoints_state_object check (jsonb_typeof(state) = 'object'),
  constraint story_system_checkpoints_change_array check (jsonb_typeof(change_set) = 'array')
);

create unique index if not exists story_system_checkpoints_one_draft
  on public.story_system_checkpoints(system_id, coalesce(chapter_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status = 'draft';

create unique index if not exists story_system_checkpoints_one_published
  on public.story_system_checkpoints(system_id, coalesce(chapter_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status = 'published';

create index if not exists story_system_checkpoints_lookup
  on public.story_system_checkpoints(system_id, status, chapter_id);

create table if not exists public.reader_system_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  revealed_chapter_id uuid references public.chapters(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(user_id, story_id)
);

alter table public.story_systems enable row level security;
alter table public.story_system_versions enable row level security;
alter table public.story_system_checkpoints enable row level security;
alter table public.reader_system_progress enable row level security;

drop policy if exists story_systems_admin_all on public.story_systems;
create policy story_systems_admin_all on public.story_systems for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists story_system_versions_admin_all on public.story_system_versions;
create policy story_system_versions_admin_all on public.story_system_versions for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists story_system_checkpoints_admin_all on public.story_system_checkpoints;
create policy story_system_checkpoints_admin_all on public.story_system_checkpoints for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists reader_system_progress_own_read on public.reader_system_progress;
create policy reader_system_progress_own_read on public.reader_system_progress for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists reader_system_progress_own_insert on public.reader_system_progress;
create policy reader_system_progress_own_insert on public.reader_system_progress for insert with check (auth.uid() = user_id);
drop policy if exists reader_system_progress_own_update on public.reader_system_progress;
create policy reader_system_progress_own_update on public.reader_system_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.get_reader_system_state(
  target_story_id uuid,
  context_chapter_id uuid default null,
  include_context boolean default true
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  system_row public.story_systems%rowtype;
  checkpoint_row public.story_system_checkpoints%rowtype;
  definition_row public.story_system_versions%rowtype;
  context_order integer;
begin
  if not exists (
    select 1 from public.stories s
    where s.id = target_story_id and (s.is_published = true or public.is_admin())
  ) then
    return null;
  end if;

  select * into system_row
  from public.story_systems ss
  where ss.story_id = target_story_id and ss.is_enabled = true;

  if not found then return null; end if;

  if context_chapter_id is not null then
    select c.chapter_order into context_order
    from public.chapters c
    where c.id = context_chapter_id
      and c.story_id = target_story_id
      and c.is_published = true
      and (
        public.chapter_is_public(c)
        or public.is_admin()
        or public.has_active_entitlement(auth.uid(), c.required_tier_id)
      );
    if context_order is null then return null; end if;
  elsif auth.uid() is not null then
    select c.chapter_order into context_order
    from public.reader_system_progress rp
    join public.chapters c on c.id = rp.revealed_chapter_id
    where rp.user_id = auth.uid()
      and rp.story_id = target_story_id
      and c.is_published = true
      and (
        public.chapter_is_public(c)
        or public.is_admin()
        or public.has_active_entitlement(auth.uid(), c.required_tier_id)
      );
  end if;

  select cp.* into checkpoint_row
  from public.story_system_checkpoints cp
  left join public.chapters c on c.id = cp.chapter_id
  where cp.system_id = system_row.id
    and cp.status = 'published'
    and (
      cp.chapter_id is null
      or (
        context_order is not null
        and c.is_published = true
        and (c.chapter_order < context_order or (include_context and c.chapter_order = context_order))
        and (
          public.chapter_is_public(c)
          or public.is_admin()
          or public.has_active_entitlement(auth.uid(), c.required_tier_id)
        )
      )
    )
  order by c.chapter_order desc nulls last, cp.published_at desc nulls last
  limit 1;

  if checkpoint_row.id is null then
    return jsonb_build_object('available', false, 'systemId', system_row.id, 'name', system_row.name);
  end if;

  select * into definition_row from public.story_system_versions where id = checkpoint_row.version_id;

  return jsonb_build_object(
    'available', true,
    'systemId', system_row.id,
    'name', system_row.name,
    'appearance', system_row.appearance,
    'definition', definition_row.definition,
    'version', definition_row.version_number,
    'checkpoint', jsonb_build_object(
      'id', checkpoint_row.id,
      'chapterId', checkpoint_row.chapter_id,
      'chapterOrder', (select chapter_order from public.chapters where id = checkpoint_row.chapter_id),
      'state', checkpoint_row.state,
      'changes', checkpoint_row.change_set
    )
  );
end;
$$;

create or replace function public.advance_reader_system_progress(target_story_id uuid, target_chapter_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  next_order integer;
  current_order integer;
begin
  if auth.uid() is null then return false; end if;

  select c.chapter_order into next_order
  from public.chapters c
  join public.stories s on s.id = c.story_id
  where c.id = target_chapter_id
    and c.story_id = target_story_id
    and c.is_published = true
    and s.is_published = true
    and (
      public.chapter_is_public(c)
      or public.is_admin()
      or public.has_active_entitlement(auth.uid(), c.required_tier_id)
    );
  if next_order is null then return false; end if;

  select c.chapter_order into current_order
  from public.reader_system_progress rp
  left join public.chapters c on c.id = rp.revealed_chapter_id
  where rp.user_id = auth.uid() and rp.story_id = target_story_id;

  if current_order is null or next_order >= current_order then
    insert into public.reader_system_progress(user_id, story_id, revealed_chapter_id, updated_at)
    values (auth.uid(), target_story_id, target_chapter_id, now())
    on conflict(user_id, story_id) do update
      set revealed_chapter_id = excluded.revealed_chapter_id, updated_at = now();
  end if;
  return true;
end;
$$;

create or replace function public.publish_story_system_checkpoint(
  target_system_id uuid,
  target_chapter_id uuid,
  target_version_id uuid,
  target_state jsonb,
  target_change_set jsonb default '[]'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  target_story uuid;
begin
  if not public.is_admin() then raise exception 'Admin privileges required.'; end if;
  if jsonb_typeof(target_state) <> 'object' then raise exception 'System state must be an object.'; end if;
  if jsonb_typeof(target_change_set) <> 'array' then raise exception 'System change set must be an array.'; end if;

  select story_id into target_story from public.story_systems where id = target_system_id;
  if target_story is null then raise exception 'System not found.'; end if;
  if not exists (select 1 from public.story_system_versions where id = target_version_id and system_id = target_system_id) then
    raise exception 'System version does not belong to this system.';
  end if;
  if target_chapter_id is not null and not exists (
    select 1 from public.chapters where id = target_chapter_id and story_id = target_story
  ) then raise exception 'Checkpoint chapter does not belong to this story.'; end if;

  update public.story_system_checkpoints
  set status = 'archived', updated_at = now()
  where system_id = target_system_id
    and chapter_id is not distinct from target_chapter_id
    and status = 'published';
  delete from public.story_system_checkpoints
  where system_id = target_system_id
    and chapter_id is not distinct from target_chapter_id
    and status = 'draft';

  insert into public.story_system_checkpoints(system_id, chapter_id, version_id, status, state, change_set, published_at)
  values (target_system_id, target_chapter_id, target_version_id, 'published', target_state, target_change_set, now())
  returning id into new_id;

  update public.story_system_versions set is_locked = true, updated_at = now() where id = target_version_id;
  return new_id;
end;
$$;

grant execute on function public.get_reader_system_state(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.advance_reader_system_progress(uuid, uuid) to authenticated;
grant execute on function public.publish_story_system_checkpoint(uuid, uuid, uuid, jsonb, jsonb) to authenticated;

-- Seed the supplied Resident Evil system as an admin-only draft. Nothing becomes
-- reader-visible until the author publishes a baseline or chapter checkpoint.
with target_story as (
  select id from public.stories where slug = 'a-zombie-tale' limit 1
), seeded_system as (
  insert into public.story_systems(story_id, name, appearance)
  select id, 'Biological Evolution System',
    '{"default":{"preset":"circuit","accent":"#5ee7ff","font":"tech"},"pages":{"status":{"preset":"circuit","accent":"#5ee7ff","font":"tech"},"traits":{"preset":"arcane","accent":"#c084fc","font":"serif"},"forms":{"preset":"terminal","accent":"#2dd4bf","font":"mono"},"mutations":{"preset":"arcane","accent":"#fb7185","font":"tech"},"shop":{"preset":"terminal","accent":"#ef4444","font":"mono"},"lottery":{"preset":"arcane","accent":"#fbbf24","font":"serif"},"worlds":{"preset":"glass","accent":"#38bdf8","font":"tech"}}}'::jsonb
  from target_story
  on conflict(story_id) do update set name = excluded.name
  returning id
), system_id as (
  select id from seeded_system
  union all
  select ss.id from public.story_systems ss join target_story ts on ts.id = ss.story_id
  limit 1
), seeded_version as (
  insert into public.story_system_versions(system_id, version_number, name, definition)
  select id, 1, 'Version 1',
  $definition$
  {
    "startPageId":"status",
    "pages":[
      {"id":"status","title":"Status Screen","fields":[
        {"id":"name","label":"Name","type":"text"},
        {"id":"status","label":"Status","type":"badge"},
        {"id":"biological_integrity","label":"Biological Integrity","type":"percent"},
        {"id":"traits","label":"Traits","type":"reference_multi","sourceFieldId":"traits_catalog","linkPageId":"traits"},
        {"id":"current_form","label":"Current Biological Form","type":"reference_single","sourceFieldId":"forms_catalog","linkPageId":"forms"},
        {"id":"forms_available","label":"Forms Available","type":"reference_multi","sourceFieldId":"forms_catalog","linkPageId":"forms"},
        {"id":"mutation_slots","label":"Mutation Slots","type":"number"},
        {"id":"mutations_active","label":"Mutations Active","type":"reference_multi","sourceFieldId":"mutations_catalog","linkPageId":"mutations","maxFromFieldId":"mutation_slots"},
        {"id":"mutations_available","label":"Mutations Available","type":"reference_multi","sourceFieldId":"mutations_catalog","linkPageId":"mutations"},
        {"id":"evolution_points","label":"Evolution Points","type":"number"},
        {"id":"next_evolution_milestone","label":"Next Evolution Milestone","type":"number"},
        {"id":"evolution_points_left","label":"Points Left","type":"derived_number","operation":"subtract","fromFieldId":"next_evolution_milestone","subtractFieldId":"evolution_points"},
        {"id":"secondary_links","label":"System Pages","type":"page_links","pageIds":["shop","lottery","worlds"]}
      ]},
      {"id":"traits","title":"Traits","fields":[{"id":"traits_catalog","label":"Known Traits","type":"catalog"}]},
      {"id":"forms","title":"Biological Forms","fields":[{"id":"forms_catalog","label":"Available Forms","type":"catalog"}]},
      {"id":"mutations","title":"Mutations","fields":[{"id":"mutations_catalog","label":"Known Mutations","type":"catalog"}]},
      {"id":"shop","title":"Shop","fields":[{"id":"shop_catalog","label":"Shop Inventory","type":"catalog"}]},
      {"id":"lottery","title":"Lottery","fields":[{"id":"lottery_catalog","label":"Lottery","type":"catalog"}]},
      {"id":"worlds","title":"Worlds","fields":[{"id":"worlds_catalog","label":"Worlds","type":"catalog"}]}
    ]
  }
  $definition$::jsonb
  from system_id
  on conflict(system_id, version_number) do nothing
  returning id, system_id
), version_id as (
  select id, system_id from seeded_version
  union all
  select v.id, v.system_id from public.story_system_versions v join system_id s on s.id = v.system_id where v.version_number = 1
  limit 1
)
insert into public.story_system_checkpoints(system_id, chapter_id, version_id, status, state)
select system_id, null, id, 'draft',
  $state$
  {"values":{
    "name":"Alex",
    "status":"Alive",
    "biological_integrity":88,
    "traits_catalog":[
      {"id":"better-evolved","name":"Better Evolved","description":""},
      {"id":"controlled-infectiveness","name":"Controlled Infectiveness","description":""},
      {"id":"apex-breeding-urge","name":"Apex Breeding Urge","description":""},
      {"id":"succubus-scent-glands","name":"Succubus Scent Glands","description":""}
    ],
    "traits":["better-evolved","controlled-infectiveness","apex-breeding-urge","succubus-scent-glands"],
    "forms_catalog":[{"id":"cereberus-ma-129","name":"Cereberus/MA-129","description":"","meta":"Uncommon · Evolved"}],
    "current_form":"cereberus-ma-129",
    "forms_available":["cereberus-ma-129"],
    "mutation_slots":2,
    "mutations_catalog":[],
    "mutations_active":[],
    "mutations_available":[],
    "evolution_points":1002,
    "next_evolution_milestone":10000,
    "shop_catalog":[],
    "lottery_catalog":[],
    "worlds_catalog":[]
  }}
  $state$::jsonb
from version_id v
where not exists (
  select 1 from public.story_system_checkpoints cp
  where cp.system_id = v.system_id and cp.chapter_id is null and cp.status in ('draft','published')
);

notify pgrst, 'reload schema';
