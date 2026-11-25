-- Owner review only. Requires the earlier staged media-posts migration.
BEGIN;
ALTER TABLE public.media_posts ADD COLUMN IF NOT EXISTS studio_managed boolean NOT NULL DEFAULT false;
ALTER TABLE public.media_post_items ADD COLUMN IF NOT EXISTS content_label text
  CHECK (content_label IN ('sfw','nsfw','nsfw-extreme'));
ALTER TABLE public.media_post_items ADD COLUMN IF NOT EXISTS studio_audience text
  CHECK (studio_audience IN ('public','registered','paid'));
CREATE UNIQUE INDEX IF NOT EXISTS studio_media_original_unique ON public.media_post_items (media_url) WHERE studio_audience IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS studio_media_poster_unique ON public.media_post_items (poster_url) WHERE studio_audience IS NOT NULL AND poster_url IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS studio_media_teaser_unique ON public.media_post_items (blur_thumb_url) WHERE studio_audience IS NOT NULL AND blur_thumb_url IS NOT NULL;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('studio-media','studio-media',false,104857600,ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
ON CONFLICT (id) DO UPDATE SET public=false, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.studio_media_audience_allows(audience text, tier uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE audience
    WHEN 'public' THEN true
    WHEN 'registered' THEN auth.uid() IS NOT NULL AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean,false)
    WHEN 'paid' THEN auth.uid() IS NOT NULL AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean,false)
      AND EXISTS (SELECT 1 FROM public.reader_access_tiers t WHERE t.id=tier AND t.is_active AND t.slug <> 'free')
      AND COALESCE(public.has_active_entitlement(auth.uid(),tier),false)
    ELSE false END;
$$;
REVOKE ALL ON FUNCTION public.studio_media_audience_allows(text,uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.studio_media_story_published(story uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.stories WHERE id=story AND is_published);
$$;
REVOKE ALL ON FUNCTION public.studio_media_story_published(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.studio_media_story_published(uuid) TO anon,authenticated;
DROP POLICY IF EXISTS studio_media_visible_post ON public.media_posts;
CREATE POLICY studio_media_visible_post ON public.media_posts AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (NOT studio_managed OR public.is_admin() OR (is_published AND public.studio_media_story_published(story_id)));

CREATE OR REPLACE FUNCTION public.studio_media_can_read(object_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT (NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean,false) AND public.is_admin())
    OR EXISTS (
      SELECT 1 FROM public.media_post_items i JOIN public.media_posts p ON p.id=i.post_id
      WHERE p.studio_managed AND p.is_published AND public.studio_media_story_published(p.story_id)
        AND i.studio_audience IS NOT NULL
        AND ((i.content_label='nsfw' AND i.blur_thumb_url=object_name)
          OR ((i.media_url=object_name OR i.poster_url=object_name)
            AND public.studio_media_audience_allows(i.studio_audience,i.required_tier_id)))
    );
$$;
REVOKE ALL ON FUNCTION public.studio_media_can_read(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.studio_media_can_read(text) TO anon, authenticated;
DROP POLICY IF EXISTS studio_media_read ON storage.objects;
CREATE POLICY studio_media_read ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id='studio-media' AND public.studio_media_can_read(name));
DROP POLICY IF EXISTS studio_media_read_guard ON storage.objects;
CREATE POLICY studio_media_read_guard ON storage.objects AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (bucket_id <> 'studio-media' OR public.studio_media_can_read(name));
DROP POLICY IF EXISTS studio_media_upload ON storage.objects;
CREATE POLICY studio_media_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='studio-media' AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean,false) AND public.is_admin());
DROP POLICY IF EXISTS studio_media_upload_guard ON storage.objects;
CREATE POLICY studio_media_upload_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated,anon
  WITH CHECK (bucket_id <> 'studio-media' OR (NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean,false) AND public.is_admin()));
-- Immutable paths: browser uploads are insert-only; previously signed URLs may
-- continue to work until expiry after an audience or publication change.
DROP POLICY IF EXISTS studio_media_update_guard ON storage.objects;
CREATE POLICY studio_media_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated,anon
  USING (bucket_id <> 'studio-media') WITH CHECK (bucket_id <> 'studio-media');
DROP POLICY IF EXISTS studio_media_delete_guard ON storage.objects;
CREATE POLICY studio_media_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated,anon
  USING (bucket_id <> 'studio-media');

-- Keep the old direct-write client from changing Studio-managed rows.
DROP POLICY IF EXISTS studio_media_legacy_post_insert ON public.media_posts;
CREATE POLICY studio_media_legacy_post_insert ON public.media_posts AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT studio_managed);
DROP POLICY IF EXISTS studio_media_legacy_post_update ON public.media_posts;
CREATE POLICY studio_media_legacy_post_update ON public.media_posts AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT studio_managed) WITH CHECK (NOT studio_managed);
DROP POLICY IF EXISTS studio_media_legacy_post_delete ON public.media_posts;
CREATE POLICY studio_media_legacy_post_delete ON public.media_posts AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT studio_managed);
DROP POLICY IF EXISTS studio_media_legacy_item_insert ON public.media_post_items;
CREATE POLICY studio_media_legacy_item_insert ON public.media_post_items AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (studio_audience IS NULL AND content_label IS NULL
    AND EXISTS (SELECT 1 FROM public.media_posts p WHERE p.id=post_id AND NOT p.studio_managed));
DROP POLICY IF EXISTS studio_media_legacy_item_update ON public.media_post_items;
CREATE POLICY studio_media_legacy_item_update ON public.media_post_items AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (studio_audience IS NULL AND EXISTS (SELECT 1 FROM public.media_posts p WHERE p.id=post_id AND NOT p.studio_managed))
  WITH CHECK (studio_audience IS NULL AND content_label IS NULL
    AND EXISTS (SELECT 1 FROM public.media_posts p WHERE p.id=post_id AND NOT p.studio_managed));
DROP POLICY IF EXISTS studio_media_legacy_item_delete ON public.media_post_items;
CREATE POLICY studio_media_legacy_item_delete ON public.media_post_items AS RESTRICTIVE FOR DELETE TO authenticated
  USING (studio_audience IS NULL AND EXISTS (SELECT 1 FROM public.media_posts p WHERE p.id=post_id AND NOT p.studio_managed));

CREATE OR REPLACE FUNCTION public.save_studio_media_post(p_id uuid, p_expected timestamptz, p_post jsonb, p_items jsonb)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE old_post public.media_posts%ROWTYPE; item record; stamp timestamptz := clock_timestamp();
  live boolean := COALESCE((p_post->>'is_published')::boolean,false); pos integer := 0;
  prefix text := p_id::text || '/'; post_title text := btrim(COALESCE(p_post->>'title',''));
BEGIN
  IF auth.uid() IS NULL OR COALESCE((auth.jwt()->>'is_anonymous')::boolean,false) OR NOT COALESCE(public.is_admin(),false) THEN
    RAISE EXCEPTION 'Studio administrator required' USING ERRCODE='42501';
  END IF;
  IF p_id IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items)>60
     OR char_length(post_title) NOT BETWEEN 1 AND 180 OR char_length(COALESCE(p_post->>'caption',''))>10000
     OR (live AND (jsonb_array_length(p_items)=0 OR NULLIF(p_post->>'story_id','') IS NULL)) THEN
    RAISE EXCEPTION 'A title is required; live posts also need a story and 1–60 attachments';
  END IF;
  IF live AND NOT EXISTS (SELECT 1 FROM public.stories WHERE id=(p_post->>'story_id')::uuid AND is_published) THEN
    RAISE EXCEPTION 'A published story is required before publishing media';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  SELECT * INTO old_post FROM public.media_posts WHERE id=p_id FOR UPDATE;
  IF FOUND THEN
    IF NOT old_post.studio_managed OR old_post.updated_at IS DISTINCT FROM p_expected THEN
      RAISE EXCEPTION 'This post changed elsewhere or belongs to the legacy editor. Reload before saving.';
    END IF;
  ELSIF p_expected IS NOT NULL THEN RAISE EXCEPTION 'This post no longer exists';
  END IF;
  INSERT INTO public.media_posts (id,slug,story_id,title,caption,is_published,published_at,is_nsfw,studio_managed,created_by,updated_at)
  VALUES (p_id,'media-'||p_id,NULLIF(p_post->>'story_id','')::uuid,post_title,COALESCE(p_post->>'caption',''),live,
    CASE WHEN live THEN COALESCE(old_post.published_at,stamp) END,
    EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) a WHERE a->>'content_label' IN ('nsfw','nsfw-extreme')),true,auth.uid(),stamp)
  ON CONFLICT (id) DO UPDATE SET story_id=EXCLUDED.story_id,title=EXCLUDED.title,caption=EXCLUDED.caption,
    is_published=EXCLUDED.is_published,published_at=EXCLUDED.published_at,is_nsfw=EXCLUDED.is_nsfw,updated_at=stamp;
  DELETE FROM public.media_post_items WHERE post_id=p_id;
  FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id uuid,media_type text,media_url text,poster_url text,
    blur_thumb_url text,content_label text,studio_audience text,required_tier_id uuid,width integer,height integer,duration_seconds numeric)
  LOOP
    IF item.id IS NULL OR item.media_type IS NULL OR item.media_type NOT IN ('image','video')
       OR item.content_label IS NULL OR item.content_label NOT IN ('sfw','nsfw','nsfw-extreme')
       OR item.studio_audience IS NULL OR item.studio_audience NOT IN ('public','registered','paid')
       OR (item.content_label <> 'sfw' AND item.studio_audience='public')
       OR (item.content_label='nsfw-extreme' AND item.studio_audience<>'paid')
       OR (item.studio_audience='paid' AND live AND NOT EXISTS (SELECT 1 FROM public.reader_access_tiers t
          WHERE t.id=item.required_tier_id AND t.is_active AND t.slug <> 'free'))
       OR (item.studio_audience<>'paid' AND item.required_tier_id IS NOT NULL)
       OR (item.content_label<>'nsfw' AND item.blur_thumb_url IS NOT NULL)
       OR (item.media_type<>'video' AND item.poster_url IS NOT NULL)
       OR item.media_url IS NULL OR item.media_url !~ ('^'||prefix||'original/[0-9a-f-]{36}[.](jpg|png|webp|gif|mp4|webm)$')
       OR (item.poster_url IS NOT NULL AND item.poster_url !~ ('^'||prefix||'poster/[0-9a-f-]{36}[.]jpg$'))
       OR (item.blur_thumb_url IS NOT NULL AND item.blur_thumb_url !~ ('^'||prefix||'teaser/[0-9a-f-]{36}[.]jpg$'))
       OR EXISTS (SELECT 1 FROM unnest(ARRAY[item.media_url,item.poster_url,item.blur_thumb_url]) path
         WHERE path IS NOT NULL AND NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id='studio-media' AND o.name=path))
    THEN RAISE EXCEPTION 'Invalid attachment or audience at position %',pos+1; END IF;
    INSERT INTO public.media_post_items(id,post_id,media_type,media_url,poster_url,blur_thumb_url,
      access_mode,required_tier_id,has_tier_override,width,height,duration_seconds,sort_order,content_label,studio_audience)
    VALUES(item.id,p_id,item.media_type,item.media_url,item.poster_url,item.blur_thumb_url,
      CASE WHEN item.studio_audience='public' THEN 'public' WHEN item.content_label='nsfw' THEN 'blur_teaser' ELSE 'hard_lock' END,
      item.required_tier_id,item.studio_audience='paid',item.width,item.height,item.duration_seconds,pos,item.content_label,item.studio_audience);
    pos := pos+1;
  END LOOP;
  RETURN stamp;
END;
$$;
REVOKE ALL ON FUNCTION public.save_studio_media_post(uuid,timestamptz,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_studio_media_post(uuid,timestamptz,jsonb,jsonb) TO authenticated;

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
          'studio_private', it.studio_audience IS NOT NULL,
          'content_label', it.content_label,
          'audience', it.studio_audience,
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
          OR CASE WHEN it.studio_audience IS NOT NULL THEN public.studio_media_audience_allows(it.studio_audience, effective.tier_id)
             ELSE it.access_mode = 'public' END
          OR (
            NOT v_is_anon
            AND v_uid IS NOT NULL
            AND it.studio_audience IS NULL AND COALESCE(it_tier.is_active, false)
            AND COALESCE(public.has_active_entitlement(v_uid, effective.tier_id), false)
          )
        ) AS allowed
      ) it_can
      WHERE it.post_id = mp.id
    ), '[]'::jsonb) AS items
  FROM public.media_posts mp
  LEFT JOIN public.reader_access_tiers t ON t.id = mp.required_tier_id
  WHERE mp.is_published = true
    AND (NOT mp.studio_managed OR public.studio_media_story_published(mp.story_id))
    AND (p_story_id IS NULL OR mp.story_id = p_story_id)
  ORDER BY COALESCE(mp.published_at, mp.created_at) DESC, mp.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 24), 100))
  OFFSET GREATEST(0, COALESCE(p_offset, 0));
END;
$$;

REVOKE ALL ON FUNCTION public.get_media_post_feed(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_media_post_feed(uuid, integer, integer) TO anon, authenticated;


NOTIFY pgrst, 'reload schema';
COMMIT;
