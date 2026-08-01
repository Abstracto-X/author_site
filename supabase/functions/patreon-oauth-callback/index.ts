import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireEnv, verifyState } from '../_shared/cors.ts';
import { exchangePatreonCode, syncPatreonEntitlements } from '../_shared/patreon.ts';

const callbackStatuses = new Set([
  'linked',
  'no_matching_tier',
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
  const url = new URL(requireEnv('PATREON_PUBLIC_RETURN_URL'));
  if (url.protocol !== 'https:') throw new Error('PATREON_PUBLIC_RETURN_URL must use HTTPS.');
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
  // Return the configured canonical path even for an older signed state.
  return fallback;
};

const redirectWithStatus = (returnTo: string, status: string, grants = 0) => {
  const redirect = new URL(returnTo);
  redirect.search = '';
  redirect.hash = '#/vault';
  redirect.searchParams.set('patreon', callbackStatuses.has(status) ? status : 'callback_failed');
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
      decoded = await verifyState(state, requireEnv('PATREON_STATE_SECRET'), { allowExpired: true });
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
      token = await exchangePatreonCode(code);
    } catch {
      return redirectWithStatus(returnTo, 'token_exchange_failed');
    }

    const admin = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'));
    try {
      const result = await syncPatreonEntitlements(admin, decoded.userId, token, 'patreon_oauth_grant');
      return redirectWithStatus(returnTo, result.grants > 0 ? 'linked' : 'no_matching_tier', result.grants);
    } catch {
      return redirectWithStatus(returnTo, 'sync_failed');
    }
  } catch (err) {
    console.error('Patreon OAuth callback failed before completion.', err instanceof Error ? err.message : err);
    try {
      return redirectWithStatus(returnTo || vaultReturnUrl(), 'callback_failed');
    } catch {
      return json({ error: 'Unable to return to the reader after Patreon OAuth.' }, { status: 500 });
    }
  }
});
