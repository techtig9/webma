-- Phase 3 (template marketplace + product features): the templates table
-- previously carried only (category, name, thumbnail, tier_required,
-- structure) — enough to render a flat, ungrouped list, but nothing to
-- search, filter, or recommend against. This adds the metadata a real
-- template library needs, and is deliberately just new nullable/defaulted
-- columns: every existing seeded template row keeps working unchanged.

alter table public.templates
  add column if not exists description text not null default '',
  add column if not exists tags text[] not null default '{}',
  add column if not exists style text,
  add column if not exists industry text,
  add column if not exists is_featured boolean not null default false,
  -- Incremented each time a project is created from this template (see
  -- /api/templates/use) — the real, behavior-driven "popularity" signal the
  -- search/sort UI needs, rather than a number someone has to hand-maintain.
  add column if not exists use_count integer not null default 0;

create index if not exists templates_industry_idx on public.templates (industry);
create index if not exists templates_style_idx on public.templates (style);
create index if not exists templates_is_featured_idx on public.templates (is_featured) where is_featured;
-- GIN index for the tags array — search/filter-by-tag is the whole point of
-- this migration, and without an index every tag query is a full table scan.
create index if not exists templates_tags_idx on public.templates using gin (tags);

-- ============================================================================
-- TEMPLATE FAVORITES  (authenticated users save/favorite templates)
-- ============================================================================
create table if not exists public.template_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  template_id uuid not null references public.templates(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, template_id)
);

create index if not exists template_favorites_user_id_idx on public.template_favorites (user_id);

alter table public.template_favorites enable row level security;

create policy "users manage their own favorites" on public.template_favorites
  for all using (auth.uid() = user_id);

-- ============================================================================
-- ASSET ALT TEXT  (accessibility + SEO — spec section 27/28)
-- ============================================================================
alter table public.assets
  add column if not exists alt_text text not null default '';

-- Atomic increment for template popularity — same pattern as
-- increment_credits/decrement_credits, avoiding a read-modify-write race
-- under concurrent "use template" requests for the same template.
create or replace function public.increment_template_use_count(p_template_id uuid)
returns void as $$
begin
  update public.templates
  set use_count = use_count + 1
  where id = p_template_id;
end;
$$ language plpgsql security definer;
