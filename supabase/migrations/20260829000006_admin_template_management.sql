-- Phase 2 (admin template management): templates previously had no way to
-- hide or retire a template short of deleting the row outright — which would
-- also destroy its use_count history and break any existing project whose
-- projects.template_id still references it (that FK has no ON DELETE
-- action, so such a delete would simply fail). is_active gives the admin
-- panel a real, safe toggle: false hides a template from every
-- public-facing read (gallery, landing showcase, generation wizard) without
-- deleting it or breaking anything that already used it.
alter table public.templates
  add column if not exists is_active boolean not null default true;

create index if not exists templates_is_active_idx on public.templates (is_active) where not is_active;
