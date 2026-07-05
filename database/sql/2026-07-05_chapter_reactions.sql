-- Chapter reaction sync for the production reader.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.chapter_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('heart', 'gasp', 'theory', 'tear', 'next')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, chapter_id)
);

ALTER TABLE public.chapter_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chapter_reactions_public_read ON public.chapter_reactions;
CREATE POLICY chapter_reactions_public_read
ON public.chapter_reactions
FOR SELECT
USING (true);

DROP POLICY IF EXISTS chapter_reactions_own_insert ON public.chapter_reactions;
CREATE POLICY chapter_reactions_own_insert
ON public.chapter_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS chapter_reactions_own_update ON public.chapter_reactions;
CREATE POLICY chapter_reactions_own_update
ON public.chapter_reactions
FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS chapter_reactions_own_delete ON public.chapter_reactions;
CREATE POLICY chapter_reactions_own_delete
ON public.chapter_reactions
FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

NOTIFY pgrst, 'reload schema';
