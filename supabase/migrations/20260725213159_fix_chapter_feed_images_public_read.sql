-- Public feed media must not depend on chapter SELECT visibility: gated chapter
-- rows are intentionally hidden from guests. The synchronized index already
-- mirrors chapter publication, so published-story visibility is sufficient.

DROP POLICY IF EXISTS chapter_feed_images_public_read ON public.chapter_feed_images;
CREATE POLICY chapter_feed_images_public_read
ON public.chapter_feed_images
FOR SELECT
USING (is_published);

NOTIFY pgrst, 'reload schema';
