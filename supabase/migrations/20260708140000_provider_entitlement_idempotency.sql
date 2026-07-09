-- Make provider entitlement grants idempotent and prevent duplicate active rows.
-- Historical expired rows are retained for audit visibility, but only one active
-- provider-backed entitlement may remain per reader/provider.

BEGIN;

-- Normalize provider-backed rows whose bounded access window already ended.
UPDATE public.user_entitlements
SET status = 'expired',
    updated_at = now(),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'auto_expired_by', '2026-07-08_provider_entitlement_idempotency',
      'auto_expired_at', now()
    )
WHERE provider IS NOT NULL
  AND status = 'active'
  AND valid_until IS NOT NULL
  AND valid_until <= now();

-- Collapse current duplicate active provider rows. Keep the highest-rank tier;
-- for ties, keep the newest row. This matches the reader's cumulative rank model.
WITH ranked AS (
  SELECT
    ue.id,
    row_number() OVER (
      PARTITION BY ue.user_id, ue.provider
      ORDER BY COALESCE(t.tier_rank, 0) DESC, ue.created_at DESC, ue.id DESC
    ) AS keep_rank
  FROM public.user_entitlements ue
  LEFT JOIN public.reader_access_tiers t ON t.id = ue.tier_id
  WHERE ue.provider IS NOT NULL
    AND ue.status = 'active'
), expired_duplicates AS (
  UPDATE public.user_entitlements ue
  SET status = 'expired',
      valid_until = CASE
        WHEN ue.valid_until IS NULL OR ue.valid_until > now() THEN now()
        ELSE ue.valid_until
      END,
      updated_at = now(),
      metadata = COALESCE(ue.metadata, '{}'::jsonb) || jsonb_build_object(
        'expired_as_duplicate_by', '2026-07-08_provider_entitlement_idempotency',
        'expired_as_duplicate_at', now()
      )
  FROM ranked r
  WHERE ue.id = r.id
    AND r.keep_rank > 1
  RETURNING ue.id
)
SELECT count(*) AS duplicate_active_provider_entitlements_expired
FROM expired_duplicates;

-- Race-condition guard for Edge Functions: Patreon/provider sync must refresh the
-- existing active provider row instead of inserting another one.
CREATE UNIQUE INDEX IF NOT EXISTS user_entitlements_one_active_provider_per_user_idx
ON public.user_entitlements (user_id, provider)
WHERE provider IS NOT NULL AND status = 'active';

NOTIFY pgrst, 'reload schema';

COMMIT;