-- Keep published safe gallery rows public while requiring an active reader
-- entitlement (or admin access) for rows explicitly tagged as mature.

CREATE OR REPLACE FUNCTION public.has_active_gallery_subscription()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_entitlements ue
      JOIN public.reader_access_tiers tier ON tier.id = ue.tier_id
      WHERE ue.user_id = auth.uid()
        AND ue.status = 'active'
        AND (ue.valid_from IS NULL OR ue.valid_from <= now())
        AND (ue.valid_until IS NULL OR ue.valid_until > now())
        AND tier.is_active = true
    );
$$;

REVOKE ALL ON FUNCTION public.has_active_gallery_subscription() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_gallery_subscription() TO anon, authenticated;

DROP POLICY IF EXISTS parent_compat_gallery_public_read
  ON public.character_gallery_images;
DROP POLICY IF EXISTS gallery_published_subscription_read
  ON public.character_gallery_images;

CREATE POLICY gallery_published_subscription_read
ON public.character_gallery_images
FOR SELECT
USING (
  is_published = true
  AND EXISTS (
    SELECT 1
    FROM public.characters c
    JOIN public.stories s ON s.id = c.story_id
    WHERE c.id = character_gallery_images.character_id
      AND s.is_published = true
  )
  AND (
    NOT EXISTS (
      SELECT 1
      FROM unnest(character_gallery_images.image_tags) AS tag(value)
      WHERE lower(btrim(tag.value)) IN ('r18', 'mature', 'nsfw', '18+')
    )
    OR public.is_admin()
    OR public.has_active_gallery_subscription()
  )
);

NOTIFY pgrst, 'reload schema';
