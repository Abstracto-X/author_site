import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireEnv } from '../_shared/cors.ts';

const firstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const parseIsoDate = (value: unknown) => {
  const raw = firstString(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const futureIso = (...values: unknown[]) => {
  const now = Date.now();
  for (const value of values) {
    const iso = parseIsoDate(value);
    if (iso && new Date(iso).getTime() > now) return iso;
  }
  return null;
};

const payloadPaidThrough = (payload: Record<string, unknown>) => {
  const providerMetadata = (payload.provider_metadata || {}) as Record<string, unknown>;
  const metadata = (payload.metadata || {}) as Record<string, unknown>;
  return futureIso(
    payload.valid_until,
    payload.access_expires_at,
    payload.current_period_end,
    payload.next_charge_date,
    providerMetadata.valid_until,
    providerMetadata.access_expires_at,
    providerMetadata.current_period_end,
    providerMetadata.next_charge_date,
    metadata.valid_until,
    metadata.access_expires_at,
    metadata.current_period_end,
    metadata.next_charge_date,
  );
};

const entitlementPaidThrough = (entitlement: { valid_until?: unknown; metadata?: Record<string, unknown> | null }) => {
  const metadata = entitlement.metadata || {};
  return futureIso(
    entitlement.valid_until,
    metadata.patreon_access_expires_at,
    metadata.patreon_period_ends_at,
    metadata.provider_valid_until,
  );
};
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST required.' }, { status: 405 });

  try {
    const expectedSecret = requireEnv('PROVIDER_WEBHOOK_SECRET');
    const suppliedSecret = req.headers.get('x-provider-signature') || req.headers.get('x-webhook-secret') || '';
    if (suppliedSecret !== expectedSecret) throw new Error('Invalid webhook secret.');

    const payload = await req.json();
    const provider = String(payload.provider || '').toLowerCase();
    const providerUserId = payload.provider_user_id ? String(payload.provider_user_id) : null;
    const providerTierId = payload.provider_tier_id ? String(payload.provider_tier_id) : null;
    const status = payload.status === 'revoked' || payload.status === 'expired' ? payload.status : 'active';
    let userId = payload.user_id ? String(payload.user_id) : null;
    if (!provider) throw new Error('provider is required.');
    if (!providerTierId && status === 'active') throw new Error('provider_tier_id is required for active grants.');

    const admin = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'));

    if (!userId && providerUserId) {
      const { data: existingConnection, error: lookupError } = await admin
        .from('provider_connections')
        .select('user_id')
        .eq('provider', provider)
        .eq('provider_user_id', providerUserId)
        .maybeSingle();
      if (lookupError) throw lookupError;
      userId = existingConnection?.user_id || null;
    }
    if (!userId) throw new Error('Webhook could not resolve a Supabase user_id. Link the provider first or include user_id.');

    let connectionId = null;
    if (providerUserId) {
      const { data: connection, error: connectionError } = await admin
        .from('provider_connections')
        .upsert({
          user_id: userId,
          provider,
          provider_user_id: providerUserId,
          provider_account_label: payload.provider_account_label || providerUserId,
          status: status === 'active' ? 'active' : status,
          metadata: payload.provider_metadata || {},
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'user_id,provider' })
        .select()
        .single();
      if (connectionError) throw connectionError;
      connectionId = connection.id;
    }

    if (status !== 'active') {
      const paidThroughFromPayload = payloadPaidThrough(payload);
      const { data: activeEntitlements, error: activeError } = await admin
        .from('user_entitlements')
        .select('id,valid_until,metadata')
        .eq('user_id', userId)
        .eq('provider', provider)
        .eq('status', 'active');
      if (activeError) throw activeError;

      let preserved = 0;
      const now = new Date().toISOString();
      for (const entitlement of activeEntitlements || []) {
        const paidThrough = futureIso(paidThroughFromPayload, entitlementPaidThrough(entitlement));
        const update = paidThrough
          ? {
            status: 'active',
            valid_until: paidThrough,
            metadata: {
              ...(entitlement.metadata || {}),
              provider_cancel_status: status,
              provider_access_preserved_until: paidThrough,
              provider_access_preserved_at: now,
            },
          }
          : { status, valid_until: now };
        if (paidThrough) preserved++;
        const { error: revokeError } = await admin
          .from('user_entitlements')
          .update(update)
          .eq('id', entitlement.id);
        if (revokeError) throw revokeError;
      }
      await admin.from('entitlement_audit_log').insert({ user_id: userId, action: preserved ? 'provider_webhook_revoke_paid_through' : 'provider_webhook_revoke', source: provider, provider, details: { ...payload, paid_through_until: paidThroughFromPayload, preserved_entitlements: preserved } });
      return json({ ok: true, provider, status, preserved_entitlements: preserved });
    }

    const { data: mapping, error: mappingError } = await admin
      .from('provider_tier_mappings')
      .select('*')
      .eq('provider', provider)
      .eq('provider_tier_id', providerTierId)
      .eq('is_active', true)
      .maybeSingle();
    if (mappingError) throw mappingError;
    if (!mapping) throw new Error(`No active provider mapping for ${provider}:${providerTierId}.`);

    const validUntil = payloadPaidThrough(payload);
    const { data: entitlement, error: entitlementError } = await admin
      .from('user_entitlements')
      .insert({
        user_id: userId,
        tier_id: mapping.tier_id,
        source: provider,
        provider,
        provider_connection_id: connectionId,
        status: 'active',
        valid_until: validUntil,
        metadata: { provider_tier_id: providerTierId, provider_valid_until: validUntil, raw: payload.metadata || {} },
      })
      .select()
      .single();
    if (entitlementError) throw entitlementError;

    await admin.from('entitlement_audit_log').insert({
      user_id: userId,
      action: 'provider_webhook_grant',
      source: provider,
      provider,
      entitlement_id: entitlement.id,
      details: payload,
    });

    return json({ ok: true, provider, entitlement_id: entitlement.id });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Webhook processing failed.' }, { status: 400 });
  }
});
