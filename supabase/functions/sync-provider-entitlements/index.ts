import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireEnv } from '../_shared/cors.ts';
import { refreshPatreonToken, syncPatreonEntitlements } from '../_shared/patreon.ts';
import {
  BOOSTY_DISCORD_PROVIDER,
  refreshDiscordToken,
  syncDiscordEntitlements,
} from '../_shared/discord.ts';

const supportedProviders = new Set(['patreon', BOOSTY_DISCORD_PROVIDER]);

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
    if (!supportedProviders.has(provider)) {
      return json({ error: `Provider sync is not implemented for ${provider}.` }, { status: 400 });
    }

    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    const admin = createClient(requireEnv('SUPABASE_URL'), serviceRoleKey);
    // The gateway verifies JWTs before the function runs. Decode the verified
    // role instead of comparing against the injected service-role secret.
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
      .eq('provider', provider)
      .maybeSingle();
    if (tokenError) throw tokenError;
    if (!tokenRow?.refresh_token && !tokenRow?.access_token) {
      const label = provider === 'patreon' ? 'Patreon' : 'Discord';
      return json({ error: `No ${label} token found. Connect ${label} first.`, provider, status: 'connect_required' }, { status: 409 });
    }

    let token = {
      access_token: tokenRow.access_token,
      refresh_token: tokenRow.refresh_token,
      token_type: tokenRow.token_type || 'Bearer',
      scope: Array.isArray(tokenRow.scopes) ? tokenRow.scopes.join(' ') : '',
      expires_at: tokenRow.expires_at || null,
    };
    const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : 0;
    if (token.refresh_token && (!token.access_token || !expiresAt || expiresAt < Date.now() + 5 * 60 * 1000)) {
      const refreshed = provider === 'patreon'
        ? await refreshPatreonToken(token.refresh_token)
        : await refreshDiscordToken(token.refresh_token);
      token = {
        ...token,
        ...refreshed,
        refresh_token: refreshed.refresh_token || token.refresh_token,
      };
    }

    if (provider === 'patreon') {
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
    }

    const result = await syncDiscordEntitlements(
      admin,
      userId,
      token,
      isServiceRequest ? 'boosty_discord_service_sync' : 'boosty_discord_manual_sync',
    );
    return json({
      ok: true,
      provider,
      status: !result.identity.inGuild ? 'not_in_server' : result.grants > 0 ? 'active' : 'no_matching_role',
      grants: result.grants,
      role_ids: result.identity.roleIds,
      matched_role_ids: result.matchedRoleIds,
      verification_expires_at: result.entitlement?.valid_until || null,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Provider sync failed.' }, { status: 500 });
  }
});
