
DO $$
DECLARE
  v_story UUID;
  v_tier UUID;
  v_key TEXT := 'LOCAL-DEMO-2026';
BEGIN
  INSERT INTO public.reader_access_tiers (slug, name, description, tier_rank, is_active)
  VALUES ('member', 'Member', 'Unlocks member-only chapters.', 10, true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    tier_rank = EXCLUDED.tier_rank,
    is_active = true
  RETURNING id INTO v_tier;

  INSERT INTO public.stories (
    slug, title, author, short_description, synopsis, genre, status, is_published, sort_order, tags
  ) VALUES (
    'sample-member-serial',
    'Sample Member Serial',
    'Site Author',
    'A tiny real-backend story used to verify the subscription reader.',
    'A lantern keeper finds a door that opens only for members of the archive.',
    'Serial fiction',
    'ongoing',
    true,
    1,
    '["sample","subscription"]'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    author = EXCLUDED.author,
    short_description = EXCLUDED.short_description,
    synopsis = EXCLUDED.synopsis,
    genre = EXCLUDED.genre,
    status = EXCLUDED.status,
    is_published = true,
    sort_order = EXCLUDED.sort_order,
    tags = EXCLUDED.tags
  RETURNING id INTO v_story;

  INSERT INTO public.chapters (
    story_id, title, content, chapter_order, word_count, is_published, required_tier_id, public_release_at, preview_text
  ) VALUES (
    v_story,
    'Free Opening',
    'This is a real Supabase-backed free chapter. If you can read this, the public chapter RPC path works.\n\nThe lantern keeper lit the first lamp and watched the archive breathe awake.',
    1,
    42,
    true,
    null,
    null,
    null
  )
  ON CONFLICT DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.chapters WHERE story_id = v_story AND chapter_order = 2) THEN
    INSERT INTO public.chapters (
      story_id, title, content, chapter_order, word_count, is_published, required_tier_id, public_release_at, preview_text
    ) VALUES (
      v_story,
      'Member Door',
      'This is locked member content from Supabase. It should only be returned by get_reader_chapter after authorization.',
      2,
      24,
      true,
      v_tier,
      null,
      'The second door waits for an active member entitlement.'
    );
  END IF;

  INSERT INTO public.access_keys (
    key_hash, key_prefix, tier_id, label, campaign, status, max_uses, uses_count, valid_until, entitlement_duration_days, metadata
  ) VALUES (
    encode(digest(upper(v_key), 'sha256'), 'hex'),
    left(v_key, 8),
    v_tier,
    'Local demo member key',
    'setup',
    'active',
    25,
    0,
    now() + interval '30 days',
    30,
    '{"created_by":"setup_seed"}'::jsonb
  )
  ON CONFLICT (key_hash) DO UPDATE SET
    status = 'active',
    valid_until = now() + interval '30 days',
    max_uses = greatest(public.access_keys.max_uses, 25),
    tier_id = EXCLUDED.tier_id;
END $$;
