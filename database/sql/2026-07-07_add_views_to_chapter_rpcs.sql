-- Drop functions before recreating with new return signatures
DROP FUNCTION IF EXISTS public.get_chapter_catalog(uuid);
DROP FUNCTION IF EXISTS public.get_reader_chapter(uuid);

-- Recreate get_chapter_catalog with views column
CREATE OR REPLACE FUNCTION public.get_chapter_catalog(target_story_id uuid)
 RETURNS TABLE(id uuid, story_id uuid, title text, chapter_order integer, word_count integer, preview_text text, required_tier_id uuid, required_tier_name text, required_tier_slug text, required_tier_rank integer, public_release_at timestamp with time zone, access_state text, can_read boolean, created_at timestamp with time zone, updated_at timestamp with time zone, is_nsfw boolean, external_url text, views integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 AS $function$
     SELECT
         c.id,
         c.story_id,
         c.title,
         c.chapter_order,
         c.word_count,
         c.preview_text,
         c.required_tier_id,
         t.name AS required_tier_name,
         t.slug AS required_tier_slug,
         t.tier_rank AS required_tier_rank,
         c.public_release_at,
         CASE
             WHEN public.chapter_is_public(c) THEN 'free'
             WHEN auth.uid() IS NULL THEN 'locked_tier'
             WHEN public.has_active_entitlement(auth.uid(), c.required_tier_id) THEN 'unlocked'
             WHEN c.public_release_at IS NOT NULL AND c.public_release_at > NOW() THEN 'early_access'
             ELSE 'locked_tier'
         END AS access_state,
         (public.chapter_is_public(c) OR public.is_admin() OR public.has_active_entitlement(auth.uid(), c.required_tier_id)) AS can_read,
         c.created_at,
         c.updated_at,
         c.is_nsfw,
         c.external_url,
         COALESCE(c.views, 0) AS views
     FROM public.chapters c
     LEFT JOIN public.reader_access_tiers t ON t.id = c.required_tier_id
     JOIN public.stories s ON s.id = c.story_id
     WHERE c.story_id = target_story_id
       AND c.is_published = TRUE
       AND s.is_published = TRUE
     ORDER BY c.chapter_order;
 $function$;

-- Recreate get_reader_chapter with views column
CREATE OR REPLACE FUNCTION public.get_reader_chapter(target_chapter_id uuid)
 RETURNS TABLE(id uuid, story_id uuid, title text, content text, chapter_order integer, word_count integer, preview_text text, required_tier_id uuid, required_tier_name text, access_state text, can_read boolean, created_at timestamp with time zone, updated_at timestamp with time zone, is_nsfw boolean, external_url text, views integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 AS $function$
 BEGIN
     RETURN QUERY
     SELECT
         c.id,
         c.story_id,
         c.title,
         CASE
             WHEN c.is_nsfw THEN NULL
             WHEN (public.chapter_is_public(c) OR public.is_admin() OR public.has_active_entitlement(auth.uid(), c.required_tier_id)) THEN c.content
             ELSE NULL
         END AS content,
         c.chapter_order,
         c.word_count,
         c.preview_text,
         c.required_tier_id,
         t.name AS required_tier_name,
         CASE
             WHEN public.chapter_is_public(c) THEN 'free'
             WHEN auth.uid() IS NULL THEN 'locked_tier'
             WHEN public.has_active_entitlement(auth.uid(), c.required_tier_id) THEN 'unlocked'
             WHEN c.public_release_at IS NOT NULL AND c.public_release_at > NOW() THEN 'early_access'
             ELSE 'locked_tier'
         END AS access_state,
         (public.chapter_is_public(c) OR public.is_admin() OR public.has_active_entitlement(auth.uid(), c.required_tier_id)) AS can_read,
         c.created_at,
         c.updated_at,
         c.is_nsfw,
         c.external_url,
         COALESCE(c.views, 0) AS views
     FROM public.chapters c
     LEFT JOIN public.reader_access_tiers t ON t.id = c.required_tier_id
     JOIN public.stories s ON s.id = c.story_id
     WHERE c.id = target_chapter_id
       AND c.is_published = TRUE
       AND s.is_published = TRUE;
 END;
 $function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_chapter_catalog(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_reader_chapter(uuid) TO anon, authenticated, service_role;

-- Reload schema
NOTIFY pgrst, 'reload schema';
