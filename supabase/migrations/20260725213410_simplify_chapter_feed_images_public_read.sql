-- The synchronized index only receives media from published chapters and is
-- maintained by a SECURITY DEFINER trigger. Public reads therefore key directly
-- off the mirrored publication flag instead of re-entering parent-table RLS.

DROP POLICY IF EXISTS chapter_feed_images_public_read ON public.chapter_feed_images;
CREATE POLICY chapter_feed_images_public_read
ON public.chapter_feed_images
FOR SELECT
USING (is_published);

NOTIFY pgrst, 'reload schema';
