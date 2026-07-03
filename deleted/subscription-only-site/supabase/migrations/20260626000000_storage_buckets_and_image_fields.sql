-- Storage buckets and policies for author-site images.
-- Covers/backgrounds/chapter images are public-read so static pages can render
-- Supabase public URLs, but writes are restricted to admin profiles.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Optional URL/path fields used by the admin UI and reader surfaces.
ALTER TABLE IF EXISTS public.stories
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS background_image_url TEXT;

ALTER TABLE IF EXISTS public.chapters
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS background_image_url TEXT,
  ADD COLUMN IF NOT EXISTS referenced_image_urls TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS media JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Create/update the storage buckets expected by the site.
-- Existing buckets keep their objects; this only normalizes bucket metadata.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('covers', 'covers', TRUE, 10485760, ARRAY['image/png','image/jpeg','image/gif','image/webp','image/avif']::text[]),
  ('backgrounds', 'backgrounds', TRUE, 15728640, ARRAY['image/png','image/jpeg','image/gif','image/webp','image/avif']::text[]),
  ('chapter-images', 'chapter-images', TRUE, 15728640, ARRAY['image/png','image/jpeg','image/gif','image/webp','image/avif']::text[]),
  ('characters', 'characters', TRUE, 10485760, ARRAY['image/png','image/jpeg','image/gif','image/webp','image/avif']::text[]),
  ('lore', 'lore', TRUE, 10485760, ARRAY['image/png','image/jpeg','image/gif','image/webp','image/avif']::text[]),
  ('maps', 'maps', TRUE, 26214400, ARRAY['image/png','image/jpeg','image/gif','image/webp','image/avif']::text[]),
  ('author', 'author', TRUE, 5242880, ARRAY['image/png','image/jpeg','image/gif','image/webp','image/avif']::text[]),
  ('Reader', 'Reader', TRUE, 5242880, ARRAY['image/png','image/jpeg','image/gif','image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  updated_at = NOW();

-- Clean up old broad policies if this project had the original permissive setup.
DROP POLICY IF EXISTS storage_public_read_author_assets ON storage.objects;
DROP POLICY IF EXISTS storage_admin_insert_author_assets ON storage.objects;
DROP POLICY IF EXISTS storage_admin_update_author_assets ON storage.objects;
DROP POLICY IF EXISTS storage_admin_delete_author_assets ON storage.objects;
DROP POLICY IF EXISTS storage_reader_public_read ON storage.objects;
DROP POLICY IF EXISTS storage_reader_insert_own ON storage.objects;
DROP POLICY IF EXISTS storage_reader_update_own ON storage.objects;
DROP POLICY IF EXISTS storage_reader_delete_own ON storage.objects;

DROP POLICY IF EXISTS "Public read author assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload author assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update author assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete author assets" ON storage.objects;
DROP POLICY IF EXISTS "Reader public read" ON storage.objects;
DROP POLICY IF EXISTS "Reader insert own" ON storage.objects;
DROP POLICY IF EXISTS "Reader update own" ON storage.objects;
DROP POLICY IF EXISTS "Reader delete own" ON storage.objects;

CREATE POLICY storage_public_read_author_assets
ON storage.objects
FOR SELECT
USING (bucket_id IN ('covers','backgrounds','chapter-images','characters','lore','maps','author'));

CREATE POLICY storage_admin_insert_author_assets
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id IN ('covers','backgrounds','chapter-images','characters','lore','maps','author')
  AND public.is_admin()
);

CREATE POLICY storage_admin_update_author_assets
ON storage.objects
FOR UPDATE
USING (
  bucket_id IN ('covers','backgrounds','chapter-images','characters','lore','maps','author')
  AND public.is_admin()
)
WITH CHECK (
  bucket_id IN ('covers','backgrounds','chapter-images','characters','lore','maps','author')
  AND public.is_admin()
);

CREATE POLICY storage_admin_delete_author_assets
ON storage.objects
FOR DELETE
USING (
  bucket_id IN ('covers','backgrounds','chapter-images','characters','lore','maps','author')
  AND public.is_admin()
);

CREATE POLICY storage_reader_public_read
ON storage.objects
FOR SELECT
USING (bucket_id = 'Reader');

-- Reader uploads must be under a user-id folder: Reader/<auth.uid()>/...
CREATE POLICY storage_reader_insert_own
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'Reader'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY storage_reader_update_own
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'Reader'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'Reader'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY storage_reader_delete_own
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'Reader'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- Bucket notes:
-- covers/backgrounds/chapter-images/characters/lore/maps/author are public-read and admin-write.
-- Reader is public-read and user-folder-write: Reader/<user_id>/...
