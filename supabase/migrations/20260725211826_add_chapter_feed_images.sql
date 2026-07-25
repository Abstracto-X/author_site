-- Public-safe chapter image index for the reader home feed.
-- These URLs are teaser media: guest blur is visual treatment, not access control.

CREATE TABLE IF NOT EXISTS public.chapter_feed_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'content' CHECK (source_kind IN ('content', 'reference')),
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  blur_for_guests BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chapter_id, image_url)
);

CREATE INDEX IF NOT EXISTS idx_chapter_feed_images_story
  ON public.chapter_feed_images(story_id, is_published, sort_order);

CREATE INDEX IF NOT EXISTS idx_chapter_feed_images_chapter
  ON public.chapter_feed_images(chapter_id, is_published, sort_order);

CREATE OR REPLACE FUNCTION public.sync_chapter_feed_images()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.chapter_feed_images WHERE chapter_id = NEW.id;

  IF NEW.is_published THEN
    INSERT INTO public.chapter_feed_images (
      story_id,
      chapter_id,
      image_url,
      source_kind,
      sort_order,
      is_published,
      blur_for_guests
    )
    SELECT
      NEW.story_id,
      NEW.id,
      source.image_url,
      source.source_kind,
      source.sort_order,
      TRUE,
      TRUE
    FROM (
      SELECT DISTINCT ON (candidate.image_url)
        candidate.image_url,
        candidate.source_kind,
        candidate.sort_order
      FROM (
        SELECT
          BTRIM(ref.url) AS image_url,
          'reference'::TEXT AS source_kind,
          ref.ordinality::INTEGER AS sort_order
        FROM unnest(COALESCE(NEW.referenced_image_urls, '{}'::TEXT[]))
          WITH ORDINALITY AS ref(url, ordinality)

        UNION ALL

        SELECT
          BTRIM(match.parts[1]) AS image_url,
          'content'::TEXT AS source_kind,
          (1000 + ROW_NUMBER() OVER ())::INTEGER AS sort_order
        FROM regexp_matches(
          COALESCE(NEW.content, ''),
          '<img[^>]+src=["'']([^"'']+)["'']',
          'gi'
        ) AS match(parts)
      ) AS candidate
      WHERE candidate.image_url ~* '^https?://'
      ORDER BY candidate.image_url, candidate.sort_order
    ) AS source
    ON CONFLICT (chapter_id, image_url) DO UPDATE
      SET story_id = EXCLUDED.story_id,
          source_kind = EXCLUDED.source_kind,
          sort_order = EXCLUDED.sort_order,
          is_published = EXCLUDED.is_published,
          updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS chapters_sync_feed_images ON public.chapters;
CREATE TRIGGER chapters_sync_feed_images
AFTER INSERT OR UPDATE OF content, referenced_image_urls, is_published, story_id
ON public.chapters
FOR EACH ROW
EXECUTE FUNCTION public.sync_chapter_feed_images();

INSERT INTO public.chapter_feed_images (
  story_id,
  chapter_id,
  image_url,
  source_kind,
  sort_order,
  is_published,
  blur_for_guests
)
SELECT
  source.story_id,
  source.chapter_id,
  source.image_url,
  source.source_kind,
  source.sort_order,
  TRUE,
  TRUE
FROM (
  SELECT DISTINCT ON (candidate.chapter_id, candidate.image_url)
    candidate.story_id,
    candidate.chapter_id,
    candidate.image_url,
    candidate.source_kind,
    candidate.sort_order
  FROM (
    SELECT
      chapter.story_id,
      chapter.id AS chapter_id,
      BTRIM(ref.url) AS image_url,
      'reference'::TEXT AS source_kind,
      ref.ordinality::INTEGER AS sort_order
    FROM public.chapters AS chapter
    CROSS JOIN LATERAL unnest(COALESCE(chapter.referenced_image_urls, '{}'::TEXT[]))
      WITH ORDINALITY AS ref(url, ordinality)
    WHERE chapter.is_published

    UNION ALL

    SELECT
      chapter.story_id,
      chapter.id AS chapter_id,
      BTRIM(match.parts[1]) AS image_url,
      'content'::TEXT AS source_kind,
      (1000 + ROW_NUMBER() OVER (PARTITION BY chapter.id))::INTEGER AS sort_order
    FROM public.chapters AS chapter
    CROSS JOIN LATERAL regexp_matches(
      COALESCE(chapter.content, ''),
      '<img[^>]+src=["'']([^"'']+)["'']',
      'gi'
    ) AS match(parts)
    WHERE chapter.is_published
  ) AS candidate
  WHERE candidate.image_url ~* '^https?://'
  ORDER BY candidate.chapter_id, candidate.image_url, candidate.sort_order
) AS source
ON CONFLICT (chapter_id, image_url) DO UPDATE
  SET story_id = EXCLUDED.story_id,
      source_kind = EXCLUDED.source_kind,
      sort_order = EXCLUDED.sort_order,
      is_published = EXCLUDED.is_published,
      updated_at = NOW();

ALTER TABLE public.chapter_feed_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chapter_feed_images_public_read ON public.chapter_feed_images;
CREATE POLICY chapter_feed_images_public_read
ON public.chapter_feed_images
FOR SELECT
USING (is_published);

DROP POLICY IF EXISTS chapter_feed_images_admin_all ON public.chapter_feed_images;
CREATE POLICY chapter_feed_images_admin_all
ON public.chapter_feed_images
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

GRANT SELECT ON public.chapter_feed_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chapter_feed_images TO authenticated;

NOTIFY pgrst, 'reload schema';
