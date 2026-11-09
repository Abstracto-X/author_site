window.SUBSCRIPTION_SITE_CONFIG = {
  siteKey: "evilarchives",
  siteProfiles: {
    "evilarchives": {
      backendUrl: "https://cqgrulawpwkrdvxagzez.supabase.co",
      identity: { siteName: "EvilArchives", siteTagline: "Premium serial fiction archive" },
      tierPresentation: {
        "ba1a06fd-ae33-4d24-9659-302d219bcc22": { accent: "#fbbf24", lockClass: "tier-licker" },
        "b592c08d-3f00-42c0-8b53-f551efe01074": { accent: "#c084fc", lockClass: "tier-tyrant" },
        "f8bfcbae-7ea3-407b-b0db-87808b3c547e": { accent: "#fb7185" },
        "0fc1b064-415e-4425-b6f6-558e941c1a10": { accent: "#38bdf8" }
      },
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
