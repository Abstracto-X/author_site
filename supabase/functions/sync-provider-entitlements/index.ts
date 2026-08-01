import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireEnv } from '../_shared/cors.ts';
import { refreshPatreonToken, syncPatreonEntitlements } from '../_shared/patreon.ts';

const bearerRole = (authHeader: string) => {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const payload = token.split('.')[1] || '';
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(normalized));
    return typeof decoded?.role === 'string' ? decoded.role : '';
  } catch {
    return '';
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST required.' }, { status: 405 });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader) throw new Error('Sign in before syncing provider access.');

    const body = await req.json().catch(() => ({}));
    const provider = typeof body.provider === 'string' ? body.provider.toLowerCase() : 'patreon';
    if (provider !== 'patreon') return json({ error: `Provider sync is not implemented for ${provider}.` }, { status: 400 });

    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    const admin = createClient(requireEnv('SUPABASE_URL'), serviceRoleKey);
    // The gateway verifies JWTs before the function runs. Decode the verified
    // role instead of comparing against SUPABASE_SERVICE_ROLE_KEY because a
    // rotated legacy service-role JWT can remain valid while the injected
    // default secret still exposes the previous value.
    const isServiceRequest = bearerRole(authHeader) === 'service_role';
    let userId = '';

    if (isServiceRequest) {
      userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
        return json({ error: 'A valid user_id is required for a service-role sync.' }, { status: 400 });
      }
    } else {
      const supabase = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Unable to verify the signed-in reader.');
      userId = user.id;
    }

    const { data: tokenRow, error: tokenError } = await admin
      .from('provider_oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'patreon')
      .maybeSingle();
    if (tokenError) throw tokenError;
    if (!tokenRow?.refresh_token && !tokenRow?.access_token) {
      return json({ error: 'No Patreon token found. Connect Patreon first.', provider, status: 'connect_required' }, { status: 409 });
    }

    let token = {
      access_token: tokenRow.access_token,
      refresh_token: tokenRow.refresh_token,
      token_type: tokenRow.token_type || 'Bearer',
      scope: Array.isArray(tokenRow.scopes) ? tokenRow.scopes.join(' ') : '',
    };
    const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : 0;
    if (token.refresh_token && (!expiresAt || expiresAt < Date.now() + 5 * 60 * 1000)) {
      token = { ...token, ...(await refreshPatreonToken(token.refresh_token)) };
    }

    const result = await syncPatreonEntitlements(
      admin,
      userId,
      token,
      isServiceRequest ? 'patreon_campaign_resync' : 'patreon_manual_sync',
    );
    return json({
      ok: true,
      provider,
      status: result.grants > 0 ? 'active' : 'no_matching_tier',
      grants: result.grants,
      tier_ids: result.identity.tierIds,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Provider sync failed.' }, { status: 500 });
  }
});
