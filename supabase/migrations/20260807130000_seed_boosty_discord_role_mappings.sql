BEGIN;

WITH role_mappings(provider_tier_id, provider_tier_label, internal_slug) AS (
  VALUES
    ('1535052798805147739', 'Resident Licker', 'resident-licker'),
    ('1535053372955304057', 'Resident Tyrant', 'resident-tyrant'),
    ('1535053381104836708', 'Resident Nemesis', 'resident-nemesis'),
    ('1535053896597119077', 'Resident Evil', 'resident-evil')
)
INSERT INTO public.provider_tier_mappings (
  provider,
  provider_tier_id,
  provider_tier_label,
  tier_id,
  is_active,
  metadata
)
SELECT
  'boosty_discord',
  role_mappings.provider_tier_id,
  role_mappings.provider_tier_label,
  reader_access_tiers.id,
  TRUE,
  jsonb_build_object(
    'source', 'boosty_discord_role',
    'discord_guild_id', '1530723815414300702',
    'boosty_page_url', 'https://boosty.to/hornyshitler'
  )
FROM role_mappings
JOIN public.reader_access_tiers
  ON reader_access_tiers.slug = role_mappings.internal_slug
ON CONFLICT (provider, provider_tier_id) DO UPDATE
SET
  provider_tier_label = EXCLUDED.provider_tier_label,
  tier_id = EXCLUDED.tier_id,
  is_active = TRUE,
  metadata = EXCLUDED.metadata;

COMMIT;
