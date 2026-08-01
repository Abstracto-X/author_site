-- Scope Patreon sync to the creator campaign through the deployed
-- PATREON_CAMPAIGN_ID=16299373 Edge Function secret, and use exact Patreon
-- tier IDs for every active reader tier mapping.

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.provider_tier_mappings AS mapping
    SET
        provider_tier_id = CASE tier.slug
            WHEN 'resident-licker' THEN '28946758'
            WHEN 'resident-tyrant' THEN '29035365'
            WHEN 'resident-nemesis' THEN '28946791'
            WHEN 'resident-evil' THEN '29035411'
        END,
        provider_tier_label = tier.name,
        metadata = COALESCE(mapping.metadata, '{}'::jsonb)
            || jsonb_build_object(
                'campaign_id', '16299373',
                'mapping_source', 'patreon_creator_api',
                'verified_at', '2026-07-29T18:05:00Z'
            )
    FROM public.reader_access_tiers AS tier
    WHERE mapping.tier_id = tier.id
      AND mapping.provider = 'patreon'
      AND tier.slug IN (
          'resident-licker',
          'resident-tyrant',
          'resident-nemesis',
          'resident-evil'
      );

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> 4 THEN
        RAISE EXCEPTION
            'Expected to update 4 Patreon tier mappings, updated %.',
            updated_count;
    END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
