window.SUBSCRIPTION_SITE_CONFIG = {
  siteName: "Member Fiction Reader",
  siteTagline: "Premium serial fiction member library",
  publicBaseUrl: "./",

  supabase: {
    url: "https://YOUR_PROJECT_REF.supabase.co",
    anonKey: "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY"
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
    enableLocalDemoReaderFeatures: false,
    enablePatreonConnect: false,
    enableAccessKeys: true,
    enableGoogleOAuth: false,
    enableReaderGuides: true
  }
};
