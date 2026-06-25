window.SUBSCRIPTION_SITE_CONFIG = {
  siteName: "Member Fiction Reader",
  siteTagline: "Premium serial fiction member library",
  publicBaseUrl: "./",

  supabase: {
    url: "https://cqgrulawpwkrdvxagzez.supabase.co",
    anonKey: "sb_publishable_e1rcS_JRu0UoABeV-d-67g_ly-_ZQGb"
  },

  auth: {
    googleEnabled: false,
    emailPasswordEnabled: true,
    oauthReturnRoute: "vault"
  },

  providers: {
    patreon: false,
    kofi: false,
    paypal: false,
    discord: false
  },

  links: {
    mainArchiveUrl: null,
    supportUrl: null,
    discordUrl: null
  },

  features: {
    enableMainArchiveLinks: false,
    enableStudioPreview: false,
    enableFixtureFallbackInProduction: false,
    enableLocalDemoReaderFeatures: true,
    enablePatreonConnect: false,
    enableAccessKeys: true,
    enableGoogleOAuth: false
  }
};
