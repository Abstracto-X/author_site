-- Media Posts, Fail-Closed Per-Item Gating (Public / Blur Teaser / Hard Lock),
-- Private Likes, Validated/Rate-Limited Comments, and Non-Listable Storage Bucket.
-- Idempotent staged migration; see PROJECT_STATE.md for the Media Studio release blockers.

BEGIN;

-- 1. Media Posts table
CREATE TABLE IF NOT EXISTS public.media_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  caption text NOT NULL DEFAULT '',
  required_tier_id uuid REFERENCES public.reader_access_tiers(id) ON DELETE SET NULL,
  is_nsfw boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  discord_thread_id text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS media_posts_slug_key ON public.media_posts (slug);
CREATE INDEX IF NOT EXISTS media_posts_published_idx ON public.media_posts (is_published, published_at DESC NULLS LAST);

-- 2. Media Post Items table
CREATE TABLE IF NOT EXISTS public.media_post_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.media_posts(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  media_url text NOT NULL,
  poster_url text,
  blur_thumb_url text,
  access_mode text NOT NULL DEFAULT 'blur_teaser' CHECK (access_mode IN ('public', 'blur_teaser', 'hard_lock')),
  required_tier_id uuid REFERENCES public.reader_access_tiers(id) ON DELETE SET NULL,
  width integer,
  height integer,
  duration_seconds numeric(8,2),
  sort_order integer NOT NULL DEFAULT 0,
  show_in_strip boolean NOT NULL DEFAULT true,
  gallery_image_id uuid REFERENCES public.character_gallery_images(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_post_items_post_order_idx ON public.media_post_items (post_id, sort_order ASC, created_at ASC);

-- A deleted override must not become inheritance when its FK is set to NULL.
ALTER TABLE public.media_post_items ADD COLUMN IF NOT EXISTS has_tier_override boolean NOT NULL DEFAULT false;
UPDATE public.media_post_items SET has_tier_override = true
WHERE required_tier_id IS NOT NULL AND NOT has_tier_override;

CREATE OR REPLACE FUNCTION public.mark_media_item_tier_override()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.required_tier_id IS NOT NULL THEN
    NEW.has_tier_override := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_media_item_tier_override ON public.media_post_items;
CREATE TRIGGER trg_mark_media_item_tier_override
  BEFORE INSERT OR UPDATE ON public.media_post_items
  FOR EACH ROW EXECUTE FUNCTION public.mark_media_item_tier_override();
REVOKE ALL ON FUNCTION public.mark_media_item_tier_override() FROM PUBLIC, anon, authenticated;

-- 3. Media Post Likes table (1 heart per post per auth.uid(); raw rows kept private)
CREATE TABLE IF NOT EXISTS public.media_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.media_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_post_likes_unique UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS media_post_likes_post_idx ON public.media_post_likes (post_id);

-- 4. Enable RLS
ALTER TABLE public.media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_post_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_post_likes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.media_posts, public.media_post_items, public.media_post_likes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.media_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_posts, public.media_post_items TO authenticated;

DROP POLICY IF EXISTS media_posts_public_select ON public.media_posts;
CREATE POLICY media_posts_public_select ON public.media_posts
  FOR SELECT USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS media_posts_admin_all ON public.media_posts;
CREATE POLICY media_posts_admin_all ON public.media_posts
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Items are never directly selectable by non-admins; readers use get_media_post_feed()
DROP POLICY IF EXISTS media_post_items_admin_all ON public.media_post_items;
CREATE POLICY media_post_items_admin_all ON public.media_post_items
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- All browser reads/writes go through RPCs; direct writes must not bypass serialization.
DROP POLICY IF EXISTS media_post_likes_public_select ON public.media_post_likes;
DROP POLICY IF EXISTS media_post_likes_private_select ON public.media_post_likes;
DROP POLICY IF EXISTS media_post_likes_own_insert ON public.media_post_likes;
DROP POLICY IF EXISTS media_post_likes_own_delete ON public.media_post_likes;

-- 5. Fail-Closed Reader Feed RPC
-- Only access_mode = 'public' is open to everyone.
-- Restricted items inherit only when they have no explicit override.
-- If effective_tier_id is NULL or inactive/deleted, access FAILS CLOSED (allowed = false).
-- Anonymous sessions (is_anonymous = true) are never treated as admin or entitled.
CREATE OR REPLACE FUNCTION public.get_media_post_feed(
  p_story_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  story_id uuid,
  slug text,
  title text,
  caption text,
  required_tier_id uuid,
  required_tier_name text,
  required_tier_slug text,
  is_nsfw boolean,
  is_published boolean,
  published_at timestamptz,
  tags text[],
  like_count bigint,
  user_liked boolean,
  comment_count bigint,
  items jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_anon boolean := COALESCE((auth.jwt()->>'is_anonymous')::boolean, false);
  v_admin boolean := (NOT v_is_anon) AND public.is_admin();
BEGIN
  RETURN QUERY
  SELECT
    mp.id,
    mp.story_id,
    mp.slug,
    mp.title,
    mp.caption,
    mp.required_tier_id,
    t.name AS required_tier_name,
    t.slug AS required_tier_slug,
    mp.is_nsfw,
    mp.is_published,
    mp.published_at,
    mp.tags,
    (SELECT count(*) FROM public.media_post_likes mpl WHERE mpl.post_id = mp.id) AS like_count,
    (v_uid IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.media_post_likes mpl WHERE mpl.post_id = mp.id AND mpl.user_id = v_uid
    )) AS user_liked,
    (SELECT count(*) FROM public.comments c WHERE c.target_type = 'media_post' AND c.target_id = mp.id) AS comment_count,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', it.id,
          'media_type', it.media_type,
          'access_mode', it.access_mode,
          'required_tier_id', effective.tier_id,
          'required_tier_name', it_tier.name,
          'locked', NOT it_can.allowed,
          'media_url', CASE WHEN it_can.allowed THEN it.media_url ELSE NULL END,
          'poster_url', CASE WHEN it_can.allowed THEN it.poster_url ELSE NULL END,
          'blur_thumb_url', CASE
            WHEN it_can.allowed THEN it.blur_thumb_url
            WHEN it.access_mode = 'blur_teaser' THEN it.blur_thumb_url
            ELSE NULL
          END,
          'width', it.width,
          'height', it.height,
          'duration_seconds', it.duration_seconds,
          'sort_order', it.sort_order,
          'show_in_strip', it.show_in_strip
        )
        ORDER BY it.sort_order ASC, it.created_at ASC
      )
      FROM public.media_post_items it
      CROSS JOIN LATERAL (
        SELECT CASE WHEN it.has_tier_override THEN it.required_tier_id ELSE mp.required_tier_id END AS tier_id
      ) effective
      LEFT JOIN public.reader_access_tiers it_tier ON it_tier.id = effective.tier_id
      CROSS JOIN LATERAL (
        SELECT (
          v_admin
          OR it.access_mode = 'public'
          OR (
            NOT v_is_anon
            AND v_uid IS NOT NULL
            AND COALESCE(it_tier.is_active, false)
            AND COALESCE(public.has_active_entitlement(v_uid, effective.tier_id), false)
          )
        ) AS allowed
      ) it_can
      WHERE it.post_id = mp.id
    ), '[]'::jsonb) AS items
  FROM public.media_posts mp
  LEFT JOIN public.reader_access_tiers t ON t.id = mp.required_tier_id
  WHERE mp.is_published = true
    AND (p_story_id IS NULL OR mp.story_id = p_story_id)
  ORDER BY COALESCE(mp.published_at, mp.created_at) DESC, mp.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 24), 100))
  OFFSET GREATEST(0, COALESCE(p_offset, 0));
END;
$$;

REVOKE ALL ON FUNCTION public.get_media_post_feed(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_media_post_feed(uuid, integer, integer) TO anon, authenticated;

-- 6. Serialized Like Toggle RPC (published posts only; derives ownership from auth.uid())
CREATE OR REPLACE FUNCTION public.toggle_media_post_like(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_liked boolean;
  v_count bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to like posts';
  END IF;

  PERFORM 1 FROM public.media_posts WHERE id = p_post_id AND is_published = true FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Media post not found or not published';
  END IF;

  -- Serialize concurrent toggles for the same (post, user)
  PERFORM pg_advisory_xact_lock(hashtext(p_post_id::text || ':' || v_uid::text));

  IF EXISTS (SELECT 1 FROM public.media_post_likes WHERE post_id = p_post_id AND user_id = v_uid) THEN
    DELETE FROM public.media_post_likes WHERE post_id = p_post_id AND user_id = v_uid;
    v_liked := false;
  ELSE
    INSERT INTO public.media_post_likes (post_id, user_id) VALUES (p_post_id, v_uid)
    ON CONFLICT (post_id, user_id) DO NOTHING;
    v_liked := true;
  END IF;

  SELECT count(*) INTO v_count FROM public.media_post_likes WHERE post_id = p_post_id;
  RETURN jsonb_build_object('liked', v_liked, 'like_count', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_media_post_like(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_media_post_like(uuid) TO authenticated;

-- 7. Media comments use the public projection and authenticated write RPC.
-- Restrictive policies close the existing permissive table paths without changing
-- chapter comments for permanent users. Admins retain raw read/edit for moderation.
DROP POLICY IF EXISTS comments_media_post_restrictive_select ON public.comments;
CREATE POLICY comments_media_post_restrictive_select ON public.comments
  AS RESTRICTIVE FOR SELECT
  USING (target_type IS DISTINCT FROM 'media_post' OR public.is_admin());

DROP POLICY IF EXISTS comments_media_post_restrictive_insert ON public.comments;
CREATE POLICY comments_media_post_restrictive_insert ON public.comments
  AS RESTRICTIVE FOR INSERT
  WITH CHECK (
    target_type IS DISTINCT FROM 'media_post'
    AND (auth.jwt()->'is_anonymous') IS DISTINCT FROM 'true'::jsonb
  );

DROP POLICY IF EXISTS comments_media_post_restrictive_update ON public.comments;
CREATE POLICY comments_media_post_restrictive_update ON public.comments
  AS RESTRICTIVE FOR UPDATE
  USING (
    public.is_admin() OR (
      target_type IS DISTINCT FROM 'media_post'
      AND (auth.jwt()->'is_anonymous') IS DISTINCT FROM 'true'::jsonb
    )
  )
  WITH CHECK (
    public.is_admin() OR (
      target_type IS DISTINCT FROM 'media_post'
      AND (auth.jwt()->'is_anonymous') IS DISTINCT FROM 'true'::jsonb
    )
  );

CREATE INDEX IF NOT EXISTS comments_media_post_user_created_idx
  ON public.comments (user_id, created_at DESC) WHERE target_type = 'media_post';
CREATE INDEX IF NOT EXISTS comments_media_post_target_created_idx
  ON public.comments (target_id, created_at DESC) WHERE target_type = 'media_post';

CREATE OR REPLACE FUNCTION public.validate_media_post_comment_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_count integer;
  v_is_guest boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.target_type = 'media_post' THEN
      IF NEW.target_type IS DISTINCT FROM OLD.target_type
        OR NEW.target_id IS DISTINCT FROM OLD.target_id
        OR NEW.user_id IS DISTINCT FROM OLD.user_id
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
        OR NEW.metadata IS DISTINCT FROM OLD.metadata THEN
        RAISE EXCEPTION 'Media comment identity, target, timestamp, and attribution cannot be changed';
      END IF;
    ELSIF NEW.target_type = 'media_post' THEN
      RAISE EXCEPTION 'Existing comments cannot be moved to a media post';
    END IF;
  END IF;

  IF NEW.target_type IS DISTINCT FROM 'media_post' THEN
    RETURN NEW;
  END IF;

  NEW.content := regexp_replace(COALESCE(NEW.content, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
  IF char_length(NEW.content) < 1 OR char_length(NEW.content) > 1000 THEN
    RAISE EXCEPTION 'Comment must be between 1 and 1000 characters';
  END IF;

  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to comment';
  END IF;

  PERFORM 1 FROM public.media_posts mp WHERE mp.id = NEW.target_id AND mp.is_published = true FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Media post not found or not published';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Lock and take the server timestamp before counting: concurrent submissions
  -- by the same user must share one rate-limit window.
  PERFORM pg_advisory_xact_lock(11301999, hashtext(NEW.user_id::text));
  NEW.created_at := clock_timestamp();
  SELECT au.is_anonymous INTO v_is_guest FROM auth.users au WHERE au.id = NEW.user_id;
  NEW.metadata := jsonb_build_object('source', 'web', 'is_guest', COALESCE(v_is_guest, false));

  SELECT count(*) INTO v_recent_count
  FROM public.comments c
  WHERE c.target_type = 'media_post'
    AND c.user_id = NEW.user_id
    AND c.created_at > NEW.created_at - interval '60 seconds';

  IF v_recent_count >= 5 THEN
    RAISE EXCEPTION 'Too many comments in a short time. Please wait a moment.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_media_post_comment_insert ON public.comments;
CREATE TRIGGER trg_validate_media_post_comment_insert
  BEFORE INSERT OR UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_media_post_comment_insert();
REVOKE ALL ON FUNCTION public.validate_media_post_comment_insert() FROM PUBLIC, anon, authenticated;

-- Safe reader RPC: displays anonymous guest comments as 'Guest' without exposing user_id
CREATE OR REPLACE FUNCTION public.get_media_post_comments(p_post_id uuid)
RETURNS TABLE (
  id uuid,
  author_label text,
  is_guest boolean,
  source text,
  content text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.media_posts WHERE media_posts.id = p_post_id AND is_published = true) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    CASE
      WHEN c.metadata->'is_guest' = 'true'::jsonb OR au.is_anonymous = true THEN 'Guest'
      ELSE COALESCE(NULLIF(p.display_name, ''), NULLIF(p.username, ''), 'Reader')
    END AS author_label,
    (COALESCE(c.metadata->'is_guest' = 'true'::jsonb, false) OR COALESCE(au.is_anonymous, false)) AS is_guest,
    'web'::text AS source,
    c.content,
    c.created_at
  FROM public.comments c
  LEFT JOIN auth.users au ON au.id = c.user_id
  LEFT JOIN public.profiles p ON p.id = c.user_id
  WHERE c.target_type = 'media_post'
    AND c.target_id = p_post_id
  ORDER BY c.created_at DESC
  LIMIT 100;
END;
$$;

REVOKE ALL ON FUNCTION public.get_media_post_comments(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_media_post_comments(uuid) TO anon, authenticated;

-- Clean insert RPC deriving user_id strictly from auth.uid()
CREATE OR REPLACE FUNCTION public.post_media_post_comment(p_post_id uuid, p_content text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_comment_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to comment';
  END IF;

  INSERT INTO public.comments (user_id, target_type, target_id, content)
  VALUES (v_uid, 'media_post', p_post_id, p_content)
  RETURNING id INTO v_comment_id;

  RETURN v_comment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.post_media_post_comment(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.post_media_post_comment(uuid, text) TO authenticated;

-- 8. Storage bucket for Media Posts (public URLs served by CDN; bucket listing restricted to admins)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-posts',
  'media-posts',
  true,
  104857600,
  ARRAY['image/png','image/jpeg','image/gif','image/webp','image/avif','video/mp4','video/webm']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Remove broad public listing policy; only admins can list objects in media-posts
DROP POLICY IF EXISTS media_posts_storage_public_read ON storage.objects;
DROP POLICY IF EXISTS media_posts_storage_admin_select ON storage.objects;
CREATE POLICY media_posts_storage_admin_select ON storage.objects
  FOR SELECT USING (bucket_id = 'media-posts' AND public.is_admin());

DROP POLICY IF EXISTS media_posts_storage_admin_insert ON storage.objects;
CREATE POLICY media_posts_storage_admin_insert ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media-posts' AND public.is_admin());

DROP POLICY IF EXISTS media_posts_storage_admin_update ON storage.objects;
CREATE POLICY media_posts_storage_admin_update ON storage.objects
  FOR UPDATE USING (bucket_id = 'media-posts' AND public.is_admin())
  WITH CHECK (bucket_id = 'media-posts' AND public.is_admin());

DROP POLICY IF EXISTS media_posts_storage_admin_delete ON storage.objects;
CREATE POLICY media_posts_storage_admin_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'media-posts' AND public.is_admin());

NOTIFY pgrst, 'reload schema';

COMMIT;
