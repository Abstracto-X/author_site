-- Restore legacy/admin story loader theme field expected by admin.html.
ALTER TABLE IF EXISTS public.stories
  ADD COLUMN IF NOT EXISTS loader_theme TEXT NOT NULL DEFAULT 'lightsaber';

COMMENT ON COLUMN public.stories.loader_theme IS 'Custom story loading animation theme used by admin/story reader UI.';

NOTIFY pgrst, 'reload schema';
