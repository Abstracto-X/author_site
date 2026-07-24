-- Migration: Add scratchpads table for draft/reference notes attached to chapters
CREATE TABLE IF NOT EXISTS public.scratchpads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text DEFAULT '',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.scratchpads ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists and create admin policy
DROP POLICY IF EXISTS scratchpads_admin_all ON public.scratchpads;
CREATE POLICY scratchpads_admin_all ON public.scratchpads
    FOR ALL
    TO public
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
