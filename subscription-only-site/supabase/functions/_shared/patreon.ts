import { optionalEnv, requireEnv } from './cors.ts';

type PatreonResource = {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: unknown }>;
};

type TokenPayload = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

const PATREON_TOKEN_URL = 'https://www.patreon.com/api/oauth2/token';
const PATREON_IDENTITY_URL = 'https://www.patreon.com/api/oauth2/v2/identity';

const appHeaders = () => ({
  'User-Agent': optionalEnv('PATREON_USER_AGENT', 'Subscription Reader'),
});

const firstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const relationIds = (resource: PatreonResource, name: string) => {
  const data = resource.relationships?.[name]?.data;
  if (!data) return [] as string[];
  const values = Array.isArray(data) ? data : [data];
  return values
    .map((item) => typeof item === 'object' && item !== null && 'id' in item ? String((item as { id: unknown }).id) : '')
    .filter(Boolean);
};

export const exchangePatreonCode = async (code: string) => {
  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: requireEnv('PATREON_CLIENT_ID'),
    client_secret: requireEnv('PATREON_CLIENT_SECRET'),
    redirect_uri: requireEnv('PATREON_REDIRECT_URI'),
  });
  const res = await fetch(PATREON_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...appHeaders() },
    body,
  });
  if (!res.ok) throw new Error(`Patreon token exchange failed: ${await res.text()}`);
  const token = await res.json() as TokenPayload;
  if (!token.access_token) throw new Error('Patreon did not return an access token.');
  return token;
};

export const refreshPatreonToken = async (refreshToken: string) => {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: requireEnv('PATREON_CLIENT_ID'),
    client_secret: requireEnv('PATREON_CLIENT_SECRET'),
  });
  const res = await fetch(PATREON_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...appHeaders() },
    body,
  });
  if (!res.ok) throw new Error(`Patreon token refresh failed: ${await res.text()}`);
  const token = await res.json() as TokenPayload;
  if (!token.access_token) throw new Error('Patreon did not return a refreshed access token.');
  return token;
};

export const fetchPatreonIdentity = async (accessToken: string) => {
  const identityUrl = new URL(PATREON_IDENTITY_URL);
  identityUrl.searchParams.set('include', 'memberships,memberships.campaign,memberships.currently_entitled_tiers');
  identityUrl.searchParams.set('fields[user]', 'full_name,email,image_url,url,vanity');
  identityUrl.searchParams.set('fields[member]', 'patron_status,currently_entitled_amount_cents,last_charge_status,last_charge_date,pledge_relationship_start');
  identityUrl.searchParams.set('fields[tier]', 'title,amount_cents,url');
  identityUrl.searchParams.set('fields[campaign]', 'creation_name,summary,url');

  const res = await fetch(identityUrl, { headers: { Authorization: `Bearer ${accessToken}`, ...appHeaders() } });
  if (!res.ok) throw new Error(`Patreon identity lookup failed: ${await res.text()}`);
  const payload = await res.json();
  const data = payload?.data as PatreonResource | undefined;
  if (!data?.id) throw new Error('Patreon identity response did not include a user id.');
  const included: PatreonResource[] = Array.isArray(payload?.included) ? payload.included : [];
  const campaignIdFilter = optionalEnv('PATREON_CAMPAIGN_ID');

  const memberships = included.filter((item) => item.type === 'member');
  const activeMemberships = memberships.filter((member) => {
    const attrs = member.attributes || {};
    const status = firstString(attrs.patron_status);
    const amount = Number(attrs.currently_entitled_amount_cents || 0);
    const campaignIds = relationIds(member, 'campaign');
    const campaignMatches = !campaignIdFilter || campaignIds.includes(campaignIdFilter);
    return campaignMatches && (status === 'active_patron' || amount > 0);
  });

  const activeTierIds = new Set<string>();
  activeMemberships.forEach((member) => relationIds(member, 'currently_entitled_tiers').forEach((id) => activeTierIds.add(id)));

  // Some Patreon responses include tier resources without relationship linkage. Keep
  // this as a fallback only when there is no campaign filter, otherwise campaign
  // scoping could become too permissive.
  if (!campaignIdFilter && activeTierIds.size === 0 && activeMemberships.length > 0) {
    included.filter((item) => item.type === 'tier').forEach((tier) => activeTierIds.add(tier.id));
  }

  const tiers = included
    .filter((item) => item.type === 'tier' && activeTierIds.has(item.id))
    .map((tier) => ({
      id: tier.id,
      title: firstString(tier.attributes?.title, `Patreon tier ${tier.id}`),
      amount_cents: Number(tier.attributes?.amount_cents || 0),
      url: firstString(tier.attributes?.url),
    }));

  const attrs = data.attributes || {};
  return {
    raw: payload,
    patreonUserId: data.id,
    accountLabel: firstString(attrs.email, attrs.full_name, attrs.vanity, `Patreon ${data.id}`),
    userAttributes: attrs,
    activeMemberships,
    tierIds: [...activeTierIds],
    tiers,
  };
};

export const expiresAtFromToken = (token: TokenPayload) => {
  const expiresIn = Number(token.expires_in || 0);
  if (!expiresIn) return null;
  return new Date(Date.now() + Math.max(0, expiresIn - 60) * 1000).toISOString();
};

export const syncPatreonEntitlements = async (
  admin: any,
  userId: string,
  token: TokenPayload,
  action = 'patreon_sync',
) => {
  const identity = await fetchPatreonIdentity(token.access_token);
  const now = new Date().toISOString();

  const { data: connection, error: connectionError } = await admin
    .from('provider_connections')
    .upsert({
      user_id: userId,
      provider: 'patreon',
      provider_user_id: identity.patreonUserId,
      provider_account_label: identity.accountLabel,
      status: 'active',
      metadata: {
        patreon_user: identity.userAttributes,
        tier_ids: identity.tierIds,
        tiers: identity.tiers,
        campaign_id_filter: optionalEnv('PATREON_CAMPAIGN_ID') || null,
      },
      last_synced_at: now,
    }, { onConflict: 'user_id,provider' })
    .select()
    .single();
  if (connectionError) throw connectionError;

  const tokenRow = {
    user_id: userId,
    provider: 'patreon',
    provider_connection_id: connection.id,
    provider_user_id: identity.patreonUserId,
    access_token: token.access_token,
    refresh_token: token.refresh_token || null,
    token_type: token.token_type || 'Bearer',
    scopes: token.scope ? String(token.scope).split(/\s+/).filter(Boolean) : [],
    expires_at: expiresAtFromToken(token),
    updated_at: now,
  };
  const { error: tokenError } = await admin
    .from('provider_oauth_tokens')
    .upsert(tokenRow, { onConflict: 'user_id,provider' });
  if (tokenError) throw new Error(`Could not store Patreon OAuth token. Run the provider_oauth_tokens migration if needed. ${tokenError.message}`);

  const { error: expireError } = await admin
    .from('user_entitlements')
    .update({ status: 'expired', valid_until: now, updated_at: now })
    .eq('user_id', userId)
    .eq('provider', 'patreon')
    .eq('status', 'active');
  if (expireError) throw expireError;

  let grants = 0;
  const grantedEntitlementIds: string[] = [];
  if (identity.tierIds.length) {
    const { data: mappings, error: mappingError } = await admin
      .from('provider_tier_mappings')
      .select('*')
      .eq('provider', 'patreon')
      .eq('is_active', true)
      .in('provider_tier_id', identity.tierIds);
    if (mappingError) throw mappingError;

    for (const mapping of mappings || []) {
      const tier = identity.tiers.find((item) => item.id === mapping.provider_tier_id);
      const { data: entitlement, error: entitlementError } = await admin
        .from('user_entitlements')
        .insert({
          user_id: userId,
          tier_id: mapping.tier_id,
          source: 'patreon',
          provider: 'patreon',
          provider_connection_id: connection.id,
          status: 'active',
          valid_from: now,
          metadata: {
            patreon_tier_id: mapping.provider_tier_id,
            patreon_tier_label: mapping.provider_tier_label || tier?.title || null,
            patreon_amount_cents: tier?.amount_cents || null,
          },
        })
        .select()
        .single();
      if (entitlementError) throw entitlementError;
      grants++;
      grantedEntitlementIds.push(entitlement.id);
      await admin.from('entitlement_audit_log').insert({
        user_id: userId,
        action,
        source: 'patreon',
        provider: 'patreon',
        entitlement_id: entitlement.id,
        details: { provider_tier_id: mapping.provider_tier_id, connection_id: connection.id },
      });
    }
  }

  if (!grants) {
    await admin.from('entitlement_audit_log').insert({
      user_id: userId,
      action: `${action}_no_matching_tier`,
      source: 'patreon',
      provider: 'patreon',
      details: { tier_ids: identity.tierIds, connection_id: connection.id },
    });
  }

  return { connection, identity, grants, grantedEntitlementIds };
};