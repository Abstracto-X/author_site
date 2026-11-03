-- Owner-reviewed migration only. Do not apply with the restricted AI database role.
-- A single, named reader account can be viewed at a chosen effective tier without
-- mutating manual, Patreon, Boosty, or access-key grants.

BEGIN;

CREATE TABLE IF NOT EXISTS public.writer_test_account_tier_override (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  tier_id uuid REFERENCES public.reader_access_tiers(id),
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT writer_test_account_only_divine_devil
    CHECK (user_id = '56ea0e7f-b744-4b5f-af6f-134eb167625f'::uuid)
);

ALTER TABLE public.writer_test_account_tier_override ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.writer_test_account_tier_override FROM PUBLIC, anon, authenticated;

-- This is also used by chapter catalog/reader RPCs, direct chapter RLS, and
-- notification fan-out. NULL target_tier_id remains public/free access.
CREATE OR REPLACE FUNCTION public.has_active_entitlement(target_user_id uuid, target_tier_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  override_tier_id uuid;
BEGIN
  IF target_tier_id IS NULL THEN RETURN true; END IF;

  SELECT o.tier_id INTO override_tier_id
  FROM public.writer_test_account_tier_override o
  WHERE o.user_id = target_user_id;

  IF FOUND THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.reader_access_tiers held
      JOIN public.reader_access_tiers required ON required.id = target_tier_id
      WHERE held.id = override_tier_id
        AND held.is_active = true
        AND held.tier_rank >= required.tier_rank
    );
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_entitlements ue
    JOIN public.reader_access_tiers held ON held.id = ue.tier_id
    JOIN public.reader_access_tiers required ON required.id = target_tier_id
    WHERE ue.user_id = target_user_id
      AND ue.status = 'active'
      AND (ue.valid_from IS NULL OR ue.valid_from <= now())
      AND (ue.valid_until IS NULL OR ue.valid_until > now())
      AND held.is_active = true
      AND held.tier_rank >= required.tier_rank
  );
END;
$$;

-- Preserve the existing RPC signature so reader clients do not need a second
-- source of truth. Free is an inactive marker row, never an access grant.
CREATE OR REPLACE FUNCTION public.get_my_entitlements()
RETURNS TABLE (
  id uuid, tier_id uuid, tier_name text, tier_slug text, tier_rank integer,
  source text, provider text, status text, valid_from timestamptz,
  valid_until timestamptz, is_active boolean, created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.writer_test_account_tier_override o
    WHERE o.user_id = auth.uid()
  ) THEN
    RETURN QUERY
      SELECT o.id, t.id, t.name, t.slug, t.tier_rank,
             'test_override'::text, NULL::text, 'active'::text,
             o.updated_at, NULL::timestamptz, true, o.updated_at
      FROM public.writer_test_account_tier_override o
      JOIN public.reader_access_tiers t ON t.id = o.tier_id
      WHERE o.user_id = auth.uid() AND t.is_active = true;
    RETURN QUERY
      SELECT o.id, NULL::uuid, 'Free access'::text, 'free'::text, 0,
             'test_override'::text, NULL::text, 'inactive'::text,
             o.updated_at, NULL::timestamptz, false, o.updated_at
      FROM public.writer_test_account_tier_override o
      WHERE o.user_id = auth.uid() AND o.tier_id IS NULL;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT ue.id, ue.tier_id, t.name, t.slug, t.tier_rank,
           ue.source, ue.provider, ue.status, ue.valid_from, ue.valid_until,
           (t.is_active = true AND ue.status = 'active' AND ue.valid_from <= now()
             AND (ue.valid_until IS NULL OR ue.valid_until > now())), ue.created_at
    FROM public.user_entitlements ue
    JOIN public.reader_access_tiers t ON t.id = ue.tier_id
    WHERE ue.user_id = auth.uid()
    ORDER BY 11 DESC, t.tier_rank DESC, ue.created_at DESC;
END;
$$;

-- Mature artwork uses its own RLS helper, so it must honor Free as well.
CREATE OR REPLACE FUNCTION public.has_active_gallery_subscription()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  override_tier_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;

  SELECT o.tier_id INTO override_tier_id
  FROM public.writer_test_account_tier_override o
  WHERE o.user_id = auth.uid();

  IF FOUND THEN
    RETURN EXISTS (
      SELECT 1 FROM public.reader_access_tiers t
      WHERE t.id = override_tier_id AND t.is_active = true
    );
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_entitlements ue
    JOIN public.reader_access_tiers t ON t.id = ue.tier_id
    WHERE ue.user_id = auth.uid()
      AND ue.status = 'active'
      AND (ue.valid_from IS NULL OR ue.valid_from <= now())
      AND (ue.valid_until IS NULL OR ue.valid_until > now())
      AND t.is_active = true
  );
END;
$$;

-- The direct chapter SELECT policy previously duplicated the entitlement
-- predicate. Reuse the override-aware helper so table reads cannot bypass it.
DROP POLICY IF EXISTS chapters_entitled_select ON public.chapters;
CREATE POLICY chapters_entitled_select ON public.chapters FOR SELECT
USING (
  is_published = true
  AND required_tier_id IS NOT NULL
  AND auth.uid() IS NOT NULL
  AND public.has_active_entitlement(auth.uid(), required_tier_id)
  AND EXISTS (
    SELECT 1 FROM public.stories s
    WHERE s.id = chapters.story_id AND s.is_published = true
  )
);

-- Writer menu reads only this fixed testing account. No arbitrary user ID is
-- accepted from the browser.
CREATE OR REPLACE FUNCTION public.get_writer_test_account_tier()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  test_user_id constant uuid := '56ea0e7f-b744-4b5f-af6f-134eb167625f';
  override_row public.writer_test_account_tier_override%ROWTYPE;
  normal_slug text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin privileges required.' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = test_user_id) THEN
    RAISE EXCEPTION 'Testing account not found.';
  END IF;

  SELECT t.slug INTO normal_slug
  FROM public.user_entitlements ue
  JOIN public.reader_access_tiers t ON t.id = ue.tier_id
  WHERE ue.user_id = test_user_id
    AND ue.status = 'active'
    AND (ue.valid_from IS NULL OR ue.valid_from <= now())
    AND (ue.valid_until IS NULL OR ue.valid_until > now())
    AND t.is_active = true
  ORDER BY t.tier_rank DESC, ue.created_at DESC
  LIMIT 1;

  SELECT * INTO override_row FROM public.writer_test_account_tier_override o
  WHERE o.user_id = test_user_id;

  RETURN jsonb_build_object(
    'account_email', 'divinedevil101@gmail.com',
    'override_active', FOUND,
    'override_slug', CASE WHEN FOUND THEN COALESCE(
      (SELECT t.slug FROM public.reader_access_tiers t WHERE t.id = override_row.tier_id), 'free') ELSE NULL END,
    'normal_slug', COALESCE(normal_slug, 'free'),
    'effective_slug', CASE WHEN FOUND THEN COALESCE(
      (SELECT t.slug FROM public.reader_access_tiers t WHERE t.id = override_row.tier_id), 'free') ELSE COALESCE(normal_slug, 'free') END,
    'updated_at', CASE WHEN FOUND THEN override_row.updated_at ELSE NULL END
  );
END;
$$;

-- selected_slug NULL restores normal access; 'free' explicitly masks all
-- paid grants. The one-row upsert/delete and audit insert share a transaction.
CREATE OR REPLACE FUNCTION public.set_writer_test_account_tier(selected_slug text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  test_user_id constant uuid := '56ea0e7f-b744-4b5f-af6f-134eb167625f';
  normalized_slug text := lower(btrim(selected_slug));
  selected_tier_id uuid;
  previous_slug text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin privileges required.' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = test_user_id) THEN
    RAISE EXCEPTION 'Testing account not found.';
  END IF;

  SELECT COALESCE(t.slug, 'free') INTO previous_slug
  FROM public.writer_test_account_tier_override o
  LEFT JOIN public.reader_access_tiers t ON t.id = o.tier_id
  WHERE o.user_id = test_user_id;

  IF selected_slug IS NULL THEN
    DELETE FROM public.writer_test_account_tier_override WHERE user_id = test_user_id;
  ELSE
    IF normalized_slug NOT IN ('free', 'resident-licker', 'resident-tyrant', 'resident-nemesis', 'resident-evil') THEN
      RAISE EXCEPTION 'Unsupported testing tier.';
    END IF;
    IF normalized_slug <> 'free' THEN
      SELECT t.id INTO selected_tier_id FROM public.reader_access_tiers t
      WHERE t.slug = normalized_slug AND t.is_active = true;
      IF selected_tier_id IS NULL THEN RAISE EXCEPTION 'Selected tier is unavailable.'; END IF;
    END IF;
    INSERT INTO public.writer_test_account_tier_override (user_id, tier_id, updated_by, updated_at)
    VALUES (test_user_id, selected_tier_id, auth.uid(), now())
    ON CONFLICT (user_id) DO UPDATE
      SET tier_id = EXCLUDED.tier_id, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at;
  END IF;

  INSERT INTO public.entitlement_audit_log (user_id, actor_user_id, action, source, details)
  VALUES (test_user_id, auth.uid(),
          CASE WHEN selected_slug IS NULL THEN 'test_tier_override_restored' ELSE 'test_tier_override_set' END,
          'manual',
          jsonb_build_object('previous_override_slug', previous_slug,
                             'selected_slug', normalized_slug));

  RETURN public.get_writer_test_account_tier();
END;
$$;

REVOKE ALL ON FUNCTION public.get_writer_test_account_tier() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_writer_test_account_tier(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_writer_test_account_tier() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_writer_test_account_tier(text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
