window.SUBSCRIPTION_SITE_CONFIG = {
  siteName: "EvilArchives",
  siteTagline: "Premium serial fiction archive",
  publicBaseUrl: "./",

  supabase: {
    url: "https://cqgrulawpwkrdvxagzez.supabase.co",
    anonKey: "sb_publishable_e1rcS_JRu0UoABeV-d-67g_ly-_ZQGb"
  },

  auth: {
    googleEnabled: true,
    emailPasswordEnabled: true,
    oauthReturnRoute: "vault"
  },

  providers: {
    patreon: true,
    boosty: true,
    kofi: false,
    paypal: false,
    discord: false
  },

  links: {
    mainArchiveUrl: null,
    supportUrl: null,
    discordUrl: null,
    boostyUrl: "https://boosty.to/hornyshitler"
  },

  features: {
    enableMainArchiveLinks: false,
    enableStudioPreview: false,
    enableFixtureFallbackInProduction: false,
    enableLocalDemoReaderFeatures: false,
    enablePatreonConnect: true,
    enableBoostyDiscordConnect: true,
    enableAccessKeys: true,
    enableGoogleOAuth: true,
    enableReaderGuides: true
  }
};
