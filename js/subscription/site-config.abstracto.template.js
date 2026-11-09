/* PLACEHOLDER ONLY: configure target project/public key before deployment. No source-site memberships or tools. */
window.SUBSCRIPTION_SITE_CONFIG = {
  siteKey: "abstracto-tales",
  siteProfiles: {
    "abstracto-tales": {
      backendUrl: "https://YOUR_PROJECT_REF.supabase.co",
      identity: { siteName: "Abstracto Tales", siteTagline: "Premium serial fiction archive" },
      appearance: { enableAppBackground: true, appBackgroundUrl: "", enableOrnateSystemDialog: false, ornateSystemDialogAfterChapter: 0 },
      links: {
      }
    }
  },
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
    boosty: false,
    kofi: false,
    paypal: false,
    discord: false
  },


  features: {
    enableMainArchiveLinks: false,
    enableStudioPreview: false,
    enableFixtureFallbackInProduction: false,
    enableLocalDemoReaderFeatures: false,
    enablePatreonConnect: false,
    enableBoostyDiscordConnect: false,
    enableAccessKeys: true,
    enableGoogleOAuth: false,
    enableReaderGuides: true
  }
};
