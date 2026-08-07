import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireEnv, verifyState } from '../_shared/cors.ts';
import { exchangeDiscordCode, syncDiscordEntitlements } from '../_shared/discord.ts';

const callbackStatuses = new Set([
  'linked',
  'no_matching_role',
  'not_in_server',
  'cancelled',
  'expired_state',
  'invalid_state',
  'missing_parameters',
  'token_exchange_failed',
  'sync_failed',
  'provider_error',
  'callback_failed',
]);

const vaultReturnUrl = () => {
  const configured = Deno.env.get('DISCORD_PUBLIC_RETURN_URL') || Deno.env.get('PATREON_PUBLIC_RETURN_URL') || '';
  if (!configured) throw new Error('Missing required environment variable: DISCORD_PUBLIC_RETURN_URL');
  const url = new URL(configured);
  if (url.protocol !== 'https:') throw new Error('DISCORD_PUBLIC_RETURN_URL must use HTTPS.');
  url.search = '';
  url.hash = '#/vault';
  return url.toString();
};

const safeReturnUrl = (candidate: unknown, fallback: string) => {
  const allowed = new URL(fallback);
  try {
    const url = new URL(typeof candidate === 'string' ? candidate : fallback);
    if (url.origin !== allowed.origin) return fallback;
  } catch {
    return fallback;
  }
  return fallback;
};

const redirectWithStatus = (returnTo: string, status: string, grants = 0) => {
  const redirect = new URL(returnTo);
  redirect.search = '';
  redirect.hash = '#/vault';
  redirect.searchParams.set('boosty', callbackStatuses.has(status) ? status : 'callback_failed');
  if (grants > 0) redirect.searchParams.set('grants', String(grants));
  return Response.redirect(redirect.toString(), 302);
};

const stateIsExpired = (issuedAt: unknown) => typeof issuedAt === 'number'
  && Date.now() - issuedAt > 15 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let returnTo = '';
  try {
    returnTo = vaultReturnUrl();
    const url = new URL(req.url);
    const error = url.searchParams.get('error');
    const state = url.searchParams.get('state');
    const code = url.searchParams.get('code');

    if (!state) return redirectWithStatus(returnTo, error === 'access_denied' ? 'cancelled' : 'missing_parameters');

    let decoded: { userId?: string; returnTo?: string; issuedAt?: number };
    try {
      decoded = await verifyState(state, requireEnv('DISCORD_STATE_SECRET'), { allowExpired: true });
    } catch {
      return redirectWithStatus(returnTo, 'invalid_state');
    }
    returnTo = safeReturnUrl(decoded.returnTo, returnTo);
    if (stateIsExpired(decoded.issuedAt)) return redirectWithStatus(returnTo, 'expired_state');
    if (!decoded.userId) return redirectWithStatus(returnTo, 'invalid_state');
    if (error) return redirectWithStatus(returnTo, error === 'access_denied' ? 'cancelled' : 'provider_error');
    if (!code) return redirectWithStatus(returnTo, 'missing_parameters');

    let token;
    try {
      token = await exchangeDiscordCode(code);
    } catch {
      return redirectWithStatus(returnTo, 'token_exchange_failed');
    }

    const admin = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'));
    try {
      const result = await syncDiscordEntitlements(admin, decoded.userId, token, 'boosty_discord_oauth_grant');
      const status = !result.identity.inGuild ? 'not_in_server' : result.grants > 0 ? 'linked' : 'no_matching_role';
      return redirectWithStatus(returnTo, status, result.grants);
    } catch (err) {
      console.error('Boosty Discord sync failed.', err instanceof Error ? err.message : err);
      return redirectWithStatus(returnTo, 'sync_failed');
    }
  } catch (err) {
    console.error('Discord OAuth callback failed before completion.', err instanceof Error ? err.message : err);
    try {
      return redirectWithStatus(returnTo || vaultReturnUrl(), 'callback_failed');
    } catch {
      return json({ error: 'Unable to return to the reader after Discord OAuth.' }, { status: 500 });
    }
  }
});
