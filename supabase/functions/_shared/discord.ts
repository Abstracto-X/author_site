import { optionalEnv, requireEnv } from './cors.ts';

type DiscordTokenPayload = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: string | null;
  scope?: string;
  token_type?: string;
};

type DiscordUser = {
  id: string;
  username?: string;
  global_name?: string | null;
  discriminator?: string;
  avatar?: string | null;
};

type DiscordGuildMember = {
  nick?: string | null;
  roles?: string[];
  pending?: boolean;
};

const DISCORD_API = 'https://discord.com/api/v10';
const DISCORD_TOKEN_URL = `${DISCORD_API}/oauth2/token`;
export const BOOSTY_DISCORD_PROVIDER = 'boosty_discord';

const tokenBody = (values: Record<string, string>) => new URLSearchParams({
  client_id: requireEnv('DISCORD_CLIENT_ID'),
  client_secret: requireEnv('DISCORD_CLIENT_SECRET'),
  ...values,
});

const discordError = async (res: Response, fallback: string) => {
  const detail = await res.text().catch(() => '');
  return new Error(`${fallback}${detail ? `: ${detail.slice(0, 500)}` : ''}`);
};

export const exchangeDiscordCode = async (code: string) => {
  const res = await fetch(DISCORD_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody({
      code,
      grant_type: 'authorization_code',
      redirect_uri: requireEnv('DISCORD_REDIRECT_URI'),
    }),
  });
  if (!res.ok) throw await discordError(res, 'Discord token exchange failed');
  const token = await res.json() as DiscordTokenPayload;
  if (!token.access_token) throw new Error('Discord did not return an access token.');
  return token;
};

export const refreshDiscordToken = async (refreshToken: string) => {
  const res = await fetch(DISCORD_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw await discordError(res, 'Discord token refresh failed');
  const token = await res.json() as DiscordTokenPayload;
  if (!token.access_token) throw new Error('Discord did not return a refreshed access token.');
  return token;
};

const discordGet = async (path: string, accessToken: string) => fetch(`${DISCORD_API}${path}`, {
  headers: { Authorization: `Bearer ${accessToken}` },
});

export const fetchDiscordIdentity = async (accessToken: string) => {
  const userRes = await discordGet('/users/@me', accessToken);
  if (!userRes.ok) throw await discordError(userRes, 'Discord identity lookup failed');
  const user = await userRes.json() as DiscordUser;
  if (!user?.id) throw new Error('Discord identity response did not include a user id.');

  const guildId = requireEnv('DISCORD_GUILD_ID');
  const memberRes = await discordGet(`/users/@me/guilds/${encodeURIComponent(guildId)}/member`, accessToken);
  let member: DiscordGuildMember | null = null;
  if (memberRes.status !== 404) {
    if (!memberRes.ok) throw await discordError(memberRes, 'Discord server membership lookup failed');
    member = await memberRes.json() as DiscordGuildMember;
  }

  const roleIds = Array.isArray(member?.roles) ? member.roles.map(String).filter(Boolean) : [];
  const username = String(user.username || '').trim();
  const globalName = String(user.global_name || '').trim();
  const accountLabel = globalName || username || `Discord ${user.id}`;
  return {
    user,
    member,
    guildId,
    inGuild: !!member,
    roleIds,
    accountLabel,
  };
};

export const expiresAtFromDiscordToken = (token: DiscordTokenPayload) => {
  const expiresIn = Number(token.expires_in || 0);
  if (!expiresIn) return token.expires_at || null;
  return new Date(Date.now() + Math.max(0, expiresIn - 60) * 1000).toISOString();
};

const entitlementTtlHours = () => {
  const configured = Number(optionalEnv('BOOSTY_DISCORD_ENTITLEMENT_TTL_HOURS', '72'));
  if (!Number.isFinite(configured)) return 72;
  return Math.min(168, Math.max(6, Math.round(configured)));
};

const audit = async (admin: any, row: Record<string, unknown>) => {
  const { error } = await admin.from('entitlement_audit_log').insert(row);
  if (error) console.warn('Unable to write Boosty Discord entitlement audit row.', error.message);
};

export const syncDiscordEntitlements = async (
  admin: any,
  userId: string,
  token: DiscordTokenPayload,
  action = 'boosty_discord_sync',
) => {
  const identity = await fetchDiscordIdentity(token.access_token);
  const now = new Date().toISOString();
  const verificationExpiresAt = new Date(Date.now() + entitlementTtlHours() * 60 * 60 * 1000).toISOString();

  const { data: connection, error: connectionError } = await admin
    .from('provider_connections')
    .upsert({
      user_id: userId,
      provider: BOOSTY_DISCORD_PROVIDER,
      provider_user_id: identity.user.id,
      provider_account_label: identity.accountLabel,
      status: 'active',
      metadata: {
        discord_user_id: identity.user.id,
        discord_username: identity.user.username || null,
        discord_global_name: identity.user.global_name || null,
        discord_guild_id: identity.guildId,
        discord_in_guild: identity.inGuild,
        discord_role_ids: identity.roleIds,
        boosty_page_url: optionalEnv('BOOSTY_PAGE_URL') || null,
        verification_expires_at: verificationExpiresAt,
      },
      last_synced_at: now,
    }, { onConflict: 'user_id,provider' })
    .select()
    .single();
  if (connectionError?.code === '23505') {
    throw new Error('This Discord account is already linked to another reader account.');
  }
  if (connectionError) throw connectionError;

  const tokenRow = {
    user_id: userId,
    provider: BOOSTY_DISCORD_PROVIDER,
    provider_connection_id: connection.id,
    provider_user_id: identity.user.id,
    access_token: token.access_token,
    refresh_token: token.refresh_token || null,
    token_type: token.token_type || 'Bearer',
    scopes: token.scope ? String(token.scope).split(/\s+/).filter(Boolean) : [],
    expires_at: expiresAtFromDiscordToken(token),
    updated_at: now,
  };
  const { error: tokenError } = await admin
    .from('provider_oauth_tokens')
    .upsert(tokenRow, { onConflict: 'user_id,provider' });
  if (tokenError) throw new Error(`Could not store the Discord OAuth token. ${tokenError.message}`);

  const { data: mappings, error: mappingError } = await admin
    .from('provider_tier_mappings')
    .select('*, reader_access_tiers(tier_rank,name,slug)')
    .eq('provider', BOOSTY_DISCORD_PROVIDER)
    .eq('is_active', true);
  if (mappingError) throw mappingError;

  const roleSet = new Set(identity.roleIds);
  const matchedMappings = (mappings || [])
    .filter((mapping: any) => roleSet.has(String(mapping.provider_tier_id || '')))
    .sort((a: any, b: any) => {
      const rankDelta = Number(b.reader_access_tiers?.tier_rank || 0) - Number(a.reader_access_tiers?.tier_rank || 0);
      return rankDelta || String(b.provider_tier_id || '').localeCompare(String(a.provider_tier_id || ''));
    });
  const desired = matchedMappings[0] || null;

  const { data: activeRows, error: activeError } = await admin
    .from('user_entitlements')
    .select('id,tier_id,metadata,created_at')
    .eq('user_id', userId)
    .eq('provider', BOOSTY_DISCORD_PROVIDER)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (activeError) throw activeError;
  const current = (activeRows || [])[0] || null;

  if (!desired) {
    for (const entitlement of activeRows || []) {
      const { error } = await admin
        .from('user_entitlements')
        .update({ status: 'expired', valid_until: now, updated_at: now, metadata: {
          ...(entitlement.metadata || {}),
          boosty_discord_expired_at: now,
          boosty_discord_expired_reason: identity.inGuild ? 'qualifying_role_missing' : 'discord_server_membership_missing',
        } })
        .eq('id', entitlement.id);
      if (error) throw error;
      await audit(admin, {
        user_id: userId,
        action: `${action}_expired`,
        source: BOOSTY_DISCORD_PROVIDER,
        provider: BOOSTY_DISCORD_PROVIDER,
        entitlement_id: entitlement.id,
        details: { role_ids: identity.roleIds, in_guild: identity.inGuild, connection_id: connection.id },
      });
    }
    return { connection, identity, grants: 0, matchedRoleIds: [], entitlement: null };
  }

  const entitlementValues = {
    tier_id: desired.tier_id,
    source: BOOSTY_DISCORD_PROVIDER,
    provider: BOOSTY_DISCORD_PROVIDER,
    provider_connection_id: connection.id,
    status: 'active',
    valid_until: verificationExpiresAt,
    updated_at: now,
    metadata: {
      ...(current?.metadata || {}),
      boosty_discord_role_id: String(desired.provider_tier_id),
      boosty_discord_role_label: desired.provider_tier_label || null,
      boosty_discord_role_ids: identity.roleIds,
      boosty_discord_guild_id: identity.guildId,
      boosty_discord_user_id: identity.user.id,
      boosty_discord_verified_at: now,
      boosty_discord_verification_expires_at: verificationExpiresAt,
    },
  };

  let entitlement: any = null;
  let created = false;
  if (current) {
    const { data, error } = await admin
      .from('user_entitlements')
      .update(entitlementValues)
      .eq('id', current.id)
      .select()
      .single();
    if (error) throw error;
    entitlement = data;
  } else {
    const { data, error } = await admin
      .from('user_entitlements')
      .insert({
        user_id: userId,
        valid_from: now,
        ...entitlementValues,
      })
      .select()
      .single();
    if (error) throw error;
    entitlement = data;
    created = true;
  }

  for (const duplicate of (activeRows || []).slice(1)) {
    const { error } = await admin
      .from('user_entitlements')
      .update({ status: 'expired', valid_until: now, updated_at: now })
      .eq('id', duplicate.id);
    if (error) throw error;
  }

  const tierChanged = current && String(current.tier_id) !== String(desired.tier_id);
  if (created || tierChanged) {
    await audit(admin, {
      user_id: userId,
      action: created ? action : `${action}_tier_changed`,
      source: BOOSTY_DISCORD_PROVIDER,
      provider: BOOSTY_DISCORD_PROVIDER,
      entitlement_id: entitlement.id,
      details: {
        role_id: String(desired.provider_tier_id),
        role_label: desired.provider_tier_label || null,
        tier_id: desired.tier_id,
        verification_expires_at: verificationExpiresAt,
        connection_id: connection.id,
      },
    });
  }

  return {
    connection,
    identity,
    grants: 1,
    matchedRoleIds: matchedMappings.map((mapping: any) => String(mapping.provider_tier_id)),
    entitlement,
  };
};
