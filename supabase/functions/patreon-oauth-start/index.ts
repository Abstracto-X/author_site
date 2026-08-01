import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireEnv, signState } from '../_shared/cors.ts';

const vaultReturnUrl = () => {
  const url = new URL(requireEnv('PATREON_PUBLIC_RETURN_URL'));
  if (url.protocol !== 'https:') throw new Error('PATREON_PUBLIC_RETURN_URL must use HTTPS.');
  url.search = '';
  url.hash = '#/vault';
  return url.toString();
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader) throw new Error('Sign in before connecting Patreon.');

    const supabase = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('Unable to verify the signed-in reader.');

    // Always return to the configured reader origin. Do not sign a browser-
    // supplied destination, which would turn the OAuth callback into an open redirect.
    const returnTo = vaultReturnUrl();
    const state = await signState({ userId: user.id, returnTo, issuedAt: Date.now() }, requireEnv('PATREON_STATE_SECRET'));

    const authUrl = new URL('https://www.patreon.com/oauth2/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', requireEnv('PATREON_CLIENT_ID'));
    authUrl.searchParams.set('redirect_uri', requireEnv('PATREON_REDIRECT_URI'));
    authUrl.searchParams.set('scope', 'identity identity[email] identity.memberships');
    authUrl.searchParams.set('state', state);
    return json({ url: authUrl.toString() });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unable to start Patreon OAuth.' }, { status: 500 });
  }
});