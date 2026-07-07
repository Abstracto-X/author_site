-- Align Patreon-facing resident access tiers with the corrected ladder.
--
-- Important preservation rules:
-- - Keep the existing old resident-tyrant UUID by converting that row to
--   resident-nemesis, so existing Nemesis entitlements remain valid.
-- - Resident Evil is the highest-rank tier because it includes all Resident
--   Nemesis benefits.
-- - New Patreon IDs for Resident Tyrant / Resident Evil are not known yet, so
--   their mappings intentionally match by exact Patreon tier title.
-- - This seeds the rolling policy windows but does not directly rewrite
--   existing chapter required_tier_id values; Admin "Save & Recalculate" or
--   future chapter saves can apply the policy intentionally.

BEGIN;

WITH nemesis AS (
  UPDATE public.reader_access_tiers
  SET slug = 'resident-nemesis',
      name = 'Resident Nemesis',
      tier_rank = 30,
      is_active = true,
      updated_at = now()
  WHERE id = (
    SELECT id
    FROM public.reader_access_tiers
    WHERE slug = 'resident-nemesis'
       OR (slug = 'resident-tyrant' AND name = 'Resident Nemesis')
    ORDER BY CASE WHEN slug = 'resident-nemesis' THEN 0 ELSE 1 END
    LIMIT 1
  )
  RETURNING id
),
licker AS (
  UPDATE public.reader_access_tiers
  SET name = 'Resident Licker',
      tier_rank = 10,
      is_active = true,
      updated_at = now()
  WHERE slug = 'resident-licker'
  RETURNING id
),
tyrant AS (
  INSERT INTO public.reader_access_tiers (slug, name, description, tier_rank, is_active)
  VALUES ('resident-tyrant', 'Resident Tyrant', '9 advanced chapters.', 20, true)
  ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      tier_rank = EXCLUDED.tier_rank,
      is_active = true,
      updated_at = now()
  RETURNING id
),
evil AS (
  INSERT INTO public.reader_access_tiers (slug, name, description, tier_rank, is_active)
  VALUES ('resident-evil', 'Resident Evil', 'Top appreciation tier with all Resident Nemesis benefits.', 40, true)
  ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      tier_rank = EXCLUDED.tier_rank,
      is_active = true,
      updated_at = now()
  RETURNING id
),
upsert_mappings AS (
  INSERT INTO public.provider_tier_mappings (provider, provider_tier_id, provider_tier_label, tier_id, is_active, metadata)
  SELECT 'patreon', '28946758', 'Resident Licker', id, true, '{"configured_by":"2026-07-07_resident_tier_ladder"}'::jsonb FROM licker
  UNION ALL
  SELECT 'patreon', '28946791', 'Resident Nemesis', id, true, '{"configured_by":"2026-07-07_resident_tier_ladder"}'::jsonb FROM nemesis
  UNION ALL
  SELECT 'patreon', 'Resident Tyrant', 'Resident Tyrant', id, true, '{"configured_by":"2026-07-07_resident_tier_ladder","match_mode":"title_until_numeric_patreon_id_known"}'::jsonb FROM tyrant
  UNION ALL
  SELECT 'patreon', 'Resident Evil', 'Resident Evil', id, true, '{"configured_by":"2026-07-07_resident_tier_ladder","match_mode":"title_until_numeric_patreon_id_known"}'::jsonb FROM evil
  ON CONFLICT (provider, provider_tier_id) DO UPDATE
  SET provider_tier_label = EXCLUDED.provider_tier_label,
      tier_id = EXCLUDED.tier_id,
      is_active = true,
      metadata = public.provider_tier_mappings.metadata || EXCLUDED.metadata
  RETURNING 1
),
policy_payload AS (
  SELECT jsonb_build_object(
    'windows',
    jsonb_build_array(
      jsonb_build_object('tier_id', (SELECT id FROM nemesis), 'count', 3),
      jsonb_build_object('tier_id', (SELECT id FROM tyrant), 'count', 3),
      jsonb_build_object('tier_id', (SELECT id FROM licker), 'count', 6)
    )
  ) AS rules
),
story_policy AS (
  INSERT INTO public.story_access_policies (story_id, enabled, rules)
  SELECT s.id, true, pp.rules
  FROM public.stories s
  CROSS JOIN policy_payload pp
  ON CONFLICT (story_id) DO UPDATE
  SET enabled = true,
      rules = EXCLUDED.rules,
      updated_at = now()
  RETURNING 1
)
SELECT
  (SELECT count(*) FROM upsert_mappings) AS mappings_upserted,
  (SELECT count(*) FROM story_policy) AS story_policies_upserted;

NOTIFY pgrst, 'reload schema';

COMMIT;
