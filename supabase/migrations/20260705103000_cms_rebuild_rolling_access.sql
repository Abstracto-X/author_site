-- CMS rebuild: rolling access policies and external-only chapter fields.

CREATE TABLE IF NOT EXISTS public.story_access_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    enabled boolean NOT NULL DEFAULT true,
    rules jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (story_id)
);

ALTER TABLE public.story_access_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS story_access_policies_admin_all ON public.story_access_policies;
CREATE POLICY story_access_policies_admin_all
ON public.story_access_policies
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS story_access_policies_public_read ON public.story_access_policies;
CREATE POLICY story_access_policies_public_read
ON public.story_access_policies
FOR SELECT
USING (
    enabled = true
    AND EXISTS (
        SELECT 1 FROM public.stories s
        WHERE s.id = story_access_policies.story_id
          AND s.is_published = true
    )
);

ALTER TABLE public.chapters
    ADD COLUMN IF NOT EXISTS is_nsfw boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS external_url text;

DROP FUNCTION IF EXISTS public.get_chapter_catalog(uuid);
CREATE OR REPLACE FUNCTION public.get_chapter_catalog(target_story_id uuid)
 RETURNS TABLE(id uuid, story_id uuid, title text, chapter_order integer, word_count integer, preview_text text, required_tier_id uuid, required_tier_name text, required_tier_slug text, required_tier_rank integer, public_release_at timestamp with time zone, access_state text, can_read boolean, created_at timestamp with time zone, updated_at timestamp with time zone, is_nsfw boolean, external_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT
        c.id, c.story_id, c.title, c.chapter_order, c.word_count, c.preview_text,
        c.required_tier_id, t.name, t.slug, t.tier_rank, c.public_release_at,
        CASE
            WHEN public.chapter_is_public(c) THEN 'free'
            WHEN auth.uid() IS NULL THEN 'locked_tier'
            WHEN public.has_active_entitlement(auth.uid(), c.required_tier_id) THEN 'unlocked'
            WHEN c.public_release_at IS NOT NULL AND c.public_release_at > NOW() THEN 'early_access'
            ELSE 'locked_tier'
        END,
        (public.chapter_is_public(c) OR public.is_admin() OR public.has_active_entitlement(auth.uid(), c.required_tier_id)),
        c.created_at, c.updated_at, c.is_nsfw, c.external_url
    FROM public.chapters c
    LEFT JOIN public.reader_access_tiers t ON t.id = c.required_tier_id
    JOIN public.stories s ON s.id = c.story_id
    WHERE c.story_id = target_story_id
      AND c.is_published = TRUE
      AND s.is_published = TRUE
    ORDER BY c.chapter_order;
$function$;

DROP FUNCTION IF EXISTS public.get_reader_chapter(uuid);
CREATE OR REPLACE FUNCTION public.get_reader_chapter(target_chapter_id uuid)
 RETURNS TABLE(id uuid, story_id uuid, title text, content text, chapter_order integer, word_count integer, preview_text text, required_tier_id uuid, required_tier_name text, access_state text, can_read boolean, created_at timestamp with time zone, updated_at timestamp with time zone, is_nsfw boolean, external_url text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        c.id, c.story_id, c.title,
        CASE
            WHEN c.is_nsfw THEN NULL
            WHEN (public.chapter_is_public(c) OR public.is_admin() OR public.has_active_entitlement(auth.uid(), c.required_tier_id)) THEN c.content
            ELSE NULL
        END,
        c.chapter_order, c.word_count, c.preview_text, c.required_tier_id, t.name,
        CASE
            WHEN public.chapter_is_public(c) THEN 'free'
            WHEN auth.uid() IS NULL THEN 'locked_tier'
            WHEN public.has_active_entitlement(auth.uid(), c.required_tier_id) THEN 'unlocked'
            WHEN c.public_release_at IS NOT NULL AND c.public_release_at > NOW() THEN 'early_access'
            ELSE 'locked_tier'
        END,
        (public.chapter_is_public(c) OR public.is_admin() OR public.has_active_entitlement(auth.uid(), c.required_tier_id)),
        c.created_at, c.updated_at, c.is_nsfw, c.external_url
    FROM public.chapters c
    LEFT JOIN public.reader_access_tiers t ON t.id = c.required_tier_id
    JOIN public.stories s ON s.id = c.story_id
    WHERE c.id = target_chapter_id
      AND c.is_published = TRUE
      AND s.is_published = TRUE;
END;
$function$;

NOTIFY pgrst, 'reload schema';
