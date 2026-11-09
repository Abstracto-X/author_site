window.SUBSCRIPTION_SITE_CONFIG = {
  siteKey: "evilarchives",
  siteProfiles: {
    "evilarchives": {
      backendUrl: "https://cqgrulawpwkrdvxagzez.supabase.co",
      identity: { siteName: "EvilArchives", siteTagline: "Premium serial fiction archive" },
      appearance: { enableAppBackground: true, appBackgroundUrl: "", enableOrnateSystemDialog: true, ornateSystemDialogAfterChapter: 70 },
      links: {
        patreonUrl: "https://www.patreon.com/cw/HornyShitler",
        boostyUrl: "https://boosty.to/hornyshitler"
      }
    }
  },
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
