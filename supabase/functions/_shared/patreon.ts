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

const normalizeTierName = (value: unknown) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ');

const parseIsoDate = (value: unknown) => {
  const raw = firstString(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const addMonthsIso = (iso: string | null, months: number) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const safeMonths = Number.isFinite(months) && months > 0 ? Math.min(Math.max(Math.round(months), 1), 24) : 1;
  date.setUTCMonth(date.getUTCMonth() + safeMonths);
  return date.toISOString();
};

const futureIso = (...values: unknown[]) => {
  const now = Date.now();
  for (const value of values) {
    const iso = parseIsoDate(value);
    if (iso && new Date(iso).getTime() > now) return iso;
  }
  return null;
};

const latestIso = (...values: unknown[]) => {
  let latest: string | null = null;
  for (const value of values) {
    const iso = parseIsoDate(value);
    if (!iso) continue;
    if (!latest || new Date(iso).getTime() > new Date(latest).getTime()) latest = iso;
  }
  return latest;
};

const membershipAccessEndsAt = (member?: PatreonResource) => {
  const attrs = member?.attributes || {};
  const nextCharge = parseIsoDate(attrs.next_charge_date);
  const lastCharge = parseIsoDate(attrs.last_charge_date);
  const cadence = Number(attrs.pledge_cadence || 1);
  return latestIso(nextCharge, addMonthsIso(lastCharge, cadence));
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
  identityUrl.searchParams.set('fields[member]', 'patron_status,currently_entitled_amount_cents,will_pay_amount_cents,last_charge_status,last_charge_date,next_charge_date,pledge_cadence,pledge_relationship_start');
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
    const entitledTierIds = relationIds(member, 'currently_entitled_tiers');
    const campaignIds = relationIds(member, 'campaign');
    const campaignMatches = !campaignIdFilter || campaignIds.includes(campaignIdFilter);
    return campaignMatches && (status === 'active_patron' || amount > 0 || entitledTierIds.length > 0);
  });

  const activeTierIds = new Set<string>();
  activeMemberships.forEach((member) => relationIds(member, 'currently_entitled_tiers').forEach((id) => activeTierIds.add(id)));
  const tierMemberships = new Map<string, PatreonResource>();
  activeMemberships.forEach((member) => {
    relationIds(member, 'currently_entitled_tiers').forEach((id) => {
      const currentEndsAt = membershipAccessEndsAt(member);
      const existing = tierMemberships.get(id);
      const existingEndsAt = membershipAccessEndsAt(existing);
      if (!existing || (currentEndsAt && (!existingEndsAt || new Date(currentEndsAt).getTime() > new Date(existingEndsAt).getTime()))) {
        tierMemberships.set(id, member);
      }
    });
  });

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
      access_expires_at: membershipAccessEndsAt(tierMemberships.get(tier.id)),
      membership: (() => {
        const member = tierMemberships.get(tier.id);
        const attrs = member?.attributes || {};
        const status = firstString(attrs.patron_status);
        const rawWillPay = attrs.will_pay_amount_cents;
        const willPay = rawWillPay === null || rawWillPay === undefined ? null : Number(rawWillPay);
        return {
          patron_status: status || null,
          last_charge_status: firstString(attrs.last_charge_status) || null,
          last_charge_date: parseIsoDate(attrs.last_charge_date),
          next_charge_date: parseIsoDate(attrs.next_charge_date),
          pledge_cadence: Number(attrs.pledge_cadence || 1),
          will_pay_amount_cents: willPay,
          is_renewing: status === 'active_patron' && (willPay === null || willPay > 0),
        };
      })(),
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
        membership_period_ends_at: latestIso(...identity.tiers.map((tier) => tier.access_expires_at)),
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

  const { data: previousActive, error: previousError } = await admin
    .from('user_entitlements')
    .select('id,tier_id,valid_until,metadata')
    .eq('user_id', userId)
    .eq('provider', 'patreon')
    .eq('status', 'active');
  if (previousError) throw previousError;

  let grants = 0;
  const grantedEntitlementIds: string[] = [];
  const matchedMappings: Array<{ mapping: any; tier: any | null; mappingId: string }> = [];
  if (identity.tierIds.length || identity.tiers.length) {
    const { data: mappings, error: mappingError } = await admin
      .from('provider_tier_mappings')
      .select('*')
      .eq('provider', 'patreon')
      .eq('is_active', true);
    if (mappingError) throw mappingError;

    for (const mapping of mappings || []) {
      const mappingId = String(mapping.provider_tier_id || '');
      const mappingLabel = normalizeTierName(mapping.provider_tier_label);
      const mappingIdAsName = normalizeTierName(mappingId);
      const tier = identity.tiers.find((item) => {
        const tierTitle = normalizeTierName(item.title);
        return item.id === mappingId
          || (!!mappingLabel && tierTitle === mappingLabel)
          || (!!mappingIdAsName && tierTitle === mappingIdAsName);
      });
      if (!tier && !identity.tierIds.includes(mappingId)) continue;
      matchedMappings.push({ mapping, tier: tier || null, mappingId });
    }
  }

  const matchedTierIds = new Set(matchedMappings.map(({ mapping }) => String(mapping.tier_id)));
  for (const previous of previousActive || []) {
    const paidThrough = matchedTierIds.has(String(previous.tier_id)) ? null : entitlementPaidThrough(previous);
    const update = paidThrough
      ? {
        status: 'active',
        valid_until: paidThrough,
        updated_at: now,
        metadata: {
          ...(previous.metadata || {}),
          patreon_access_preserved_until: paidThrough,
          patreon_access_preserved_reason: 'missing_current_tier_on_sync',
          patreon_access_preserved_at: now,
        },
      }
      : { status: 'expired', valid_until: now, updated_at: now };
    const { error: expireError } = await admin
      .from('user_entitlements')
      .update(update)
      .eq('id', previous.id);
    if (expireError) throw expireError;
  }

  for (const { mapping, tier, mappingId } of matchedMappings) {
      const accessExpiresAt = tier?.access_expires_at || null;
      const membership = tier?.membership || {};
      const validUntil = membership.is_renewing ? null : accessExpiresAt;
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
          valid_until: validUntil,
          metadata: {
            patreon_tier_id: tier?.id || mapping.provider_tier_id,
            patreon_tier_label: mapping.provider_tier_label || tier?.title || null,
            patreon_amount_cents: tier?.amount_cents || null,
            patreon_access_expires_at: accessExpiresAt,
            patreon_period_ends_at: accessExpiresAt,
            patreon_is_renewing: !!membership.is_renewing,
            patreon_member_status: membership.patron_status || null,
            patreon_last_charge_status: membership.last_charge_status || null,
            patreon_last_charge_date: membership.last_charge_date || null,
            patreon_next_charge_date: membership.next_charge_date || null,
            patreon_pledge_cadence: membership.pledge_cadence || null,
            patreon_will_pay_amount_cents: membership.will_pay_amount_cents ?? null,
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
        details: { provider_tier_id: mapping.provider_tier_id, patreon_tier_id: tier?.id || mappingId, valid_until: validUntil, access_expires_at: accessExpiresAt, connection_id: connection.id },
      });
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
