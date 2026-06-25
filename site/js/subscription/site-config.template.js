window.SUBSCRIPTION_SITE_CONFIG = {
  siteName: "Member Fiction Reader",
  siteTagline: "Premium serial fiction member library",
  publicBaseUrl: "https://YOUR_DOMAIN/",

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
    // Set to null for a subscription-only site.
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
