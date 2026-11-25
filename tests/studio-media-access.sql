-- Disposable PostgreSQL fixture only. Requires the two staged Media migrations
-- and a stub auth.uid()/auth.jwt() reading test.uid/test.anon plus the fixture tiers.
BEGIN;
INSERT INTO public.profiles(id,role) VALUES ('00000000-0000-0000-0000-000000000001','admin');
INSERT INTO public.stories VALUES ('00000000-0000-0000-0000-000000000010',true);
INSERT INTO public.reader_access_tiers VALUES ('00000000-0000-0000-0000-000000000020','paid','Paid',true);
CREATE TEMP TABLE studio_fixture AS
SELECT '00000000-0000-0000-0000-000000000100'::uuid AS post_id,
  jsonb_build_object('title','Mixed post','story_id','00000000-0000-0000-0000-000000000010') AS header,
  jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'media_type',CASE WHEN seq=3 THEN 'video' ELSE 'image' END,
    'media_url','00000000-0000-0000-0000-000000000100/original/'||gen_random_uuid()||CASE WHEN seq=3 THEN '.mp4' ELSE '.jpg' END,
    'poster_url',CASE WHEN seq=3 THEN '00000000-0000-0000-0000-000000000100/poster/'||gen_random_uuid()||'.jpg' END,
    'blur_thumb_url',CASE WHEN seq IN (2,3) THEN '00000000-0000-0000-0000-000000000100/teaser/'||gen_random_uuid()||'.jpg' END,
    'content_label',(ARRAY['sfw','nsfw','nsfw','nsfw-extreme'])[seq],
    'studio_audience',(ARRAY['public','registered','paid','paid'])[seq],
    'required_tier_id',CASE WHEN seq>=3 THEN '00000000-0000-0000-0000-000000000020' END) ORDER BY seq) AS items
FROM generate_series(1,4) seq;
GRANT SELECT ON studio_fixture TO authenticated,anon;
INSERT INTO storage.objects
SELECT 'studio-media', name FROM studio_fixture f, jsonb_array_elements(f.items) i,
  LATERAL unnest(ARRAY[i->>'media_url',i->>'poster_url',i->>'blur_thumb_url']) name WHERE name IS NOT NULL;
SET LOCAL ROLE authenticated;
SET LOCAL test.uid='00000000-0000-0000-0000-000000000001';
SET LOCAL test.anon='false';
SELECT public.save_studio_media_post(post_id,NULL,header,items) FROM studio_fixture;
DO $$ BEGIN
  IF EXISTS (SELECT FROM public.get_media_post_feed()) THEN RAISE EXCEPTION 'Draft leaked'; END IF;
END $$;
SELECT public.save_studio_media_post(f.post_id,p.updated_at,f.header||'{"is_published":true}',f.items)
FROM studio_fixture f JOIN public.media_posts p ON p.id=f.post_id;
DO $$ DECLARE n integer; BEGIN
  UPDATE public.media_posts SET title='Legacy overwrite';
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'Legacy writes bypassed Studio'; END IF;
END $$;

SET LOCAL ROLE anon;
SET LOCAL test.uid='';
DO $$ DECLARE a jsonb; BEGIN
  SELECT items INTO STRICT a FROM public.get_media_post_feed();
  IF a->0->>'media_url' IS NULL OR a->1->>'media_url' IS NOT NULL OR a->1->>'blur_thumb_url' IS NULL
     OR a->2->>'poster_url' IS NOT NULL OR a->2->>'blur_thumb_url' IS NULL OR a->3->>'blur_thumb_url' IS NOT NULL THEN
    RAISE EXCEPTION 'Guest projection did not redact the right files: %',a;
  END IF;
  IF (SELECT count(*) FROM storage.objects)<>3 THEN RAISE EXCEPTION 'Guest should see one original and two teasers'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SET LOCAL test.uid='00000000-0000-0000-0000-000000000002';
SET LOCAL test.anon='true';
DO $$ BEGIN
  IF (SELECT count(*) FROM storage.objects)<>3 THEN RAISE EXCEPTION 'Anonymous Auth user got registered access'; END IF;
END $$;
SET LOCAL test.anon='false';
DO $$ DECLARE a jsonb; BEGIN
  SELECT items INTO STRICT a FROM public.get_media_post_feed();
  IF a->1->>'media_url' IS NULL OR a->2->>'media_url' IS NOT NULL OR a->3->>'media_url' IS NOT NULL
     OR (SELECT count(*) FROM storage.objects)<>4 THEN RAISE EXCEPTION 'Registered access incorrect'; END IF;
  BEGIN
    PERFORM public.save_studio_media_post(post_id,NULL,header,items) FROM studio_fixture;
    RAISE EXCEPTION 'Non-admin save bypassed Studio';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET LOCAL test.uid='00000000-0000-0000-0000-000000000003';
DO $$ DECLARE a jsonb; BEGIN
  SELECT items INTO STRICT a FROM public.get_media_post_feed();
  IF a->2->>'media_url' IS NULL OR a->2->>'poster_url' IS NULL OR a->3->>'media_url' IS NULL
      OR (SELECT count(*) FROM storage.objects)<>7 THEN RAISE EXCEPTION 'Paid access incorrect'; END IF;
END $$;
RESET ROLE;
UPDATE public.reader_access_tiers SET is_active=false WHERE slug='paid';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM storage.objects)<>4 THEN RAISE EXCEPTION 'Inactive tier leaked paid assets'; END IF;
END $$;
RESET ROLE;
UPDATE public.stories SET is_published=false;
SET LOCAL ROLE anon;
SET LOCAL test.uid='';
DO $$ BEGIN
  IF EXISTS (SELECT FROM storage.objects) OR EXISTS (SELECT FROM public.get_media_post_feed()) OR EXISTS (SELECT FROM public.media_posts) THEN
    RAISE EXCEPTION 'Unpublished story leaked Studio data';
  END IF;
END $$;
ROLLBACK;
