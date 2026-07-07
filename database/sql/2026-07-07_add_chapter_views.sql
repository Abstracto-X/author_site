-- Add views column to public.chapters if it does not exist
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS views integer DEFAULT 0;

-- Create function to safely increment chapter views from the reader
CREATE OR REPLACE FUNCTION public.increment_chapter_views(target_chapter_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.chapters
  SET views = COALESCE(views, 0) + 1
  WHERE id = target_chapter_id;
END;
$$;

-- Grant execute permissions to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.increment_chapter_views(uuid) TO anon, authenticated, service_role;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
