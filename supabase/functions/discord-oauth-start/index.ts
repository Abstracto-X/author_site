import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireEnv, signState } from '../_shared/cors.ts';

const vaultReturnUrl = () => {
  const configured = Deno.env.get('DISCORD_PUBLIC_RETURN_URL') || Deno.env.get('PATREON_PUBLIC_RETURN_URL') || '';
  if (!configured) throw new Error('Missing required environment variable: DISCORD_PUBLIC_RETURN_URL');
  const url = new URL(configured);
  if (url.protocol !== 'https:') throw new Error('DISCORD_PUBLIC_RETURN_URL must use HTTPS.');
  url.search = '';
  url.hash = '#/vault';
  return url.toString();
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST required.' }, { status: 405 });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader) throw new Error('Sign in before connecting Boosty through Discord.');

    const supabase = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('Unable to verify the signed-in reader.');

    const returnTo = vaultReturnUrl();
    const state = await signState({ userId: user.id, returnTo, issuedAt: Date.now() }, requireEnv('DISCORD_STATE_SECRET'));
    const authUrl = new URL('https://discord.com/oauth2/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', requireEnv('DISCORD_CLIENT_ID'));
    authUrl.searchParams.set('redirect_uri', requireEnv('DISCORD_REDIRECT_URI'));
    authUrl.searchParams.set('scope', 'identify guilds.members.read');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'consent');
    return json({ url: authUrl.toString() });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unable to start Discord OAuth.' }, { status: 500 });
  }
});
