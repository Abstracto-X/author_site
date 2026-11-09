window.SUBSCRIPTION_SITE_CONFIG = {
  siteKey: "evilarchives",
  siteProfiles: {
    "evilarchives": {
      backendUrl: "https://cqgrulawpwkrdvxagzez.supabase.co",
      identity: { siteName: "EvilArchives", siteTagline: "Premium serial fiction archive" },
      writerTestAccount: {"enabled": true, "accountEmail": "divinedevil101@gmail.com", "label": "Divine Devil", "tiers": {"free": "Free", "resident-licker": "Resident Licker", "resident-tyrant": "Resident Tyrant", "resident-nemesis": "Resident Nemesis", "resident-evil": "Resident Evil"}},
      profileFrames: [{"id": "licker", "label": "Bronze Crest", "src": "assets/profile-frames/member-tiers.png", "slice": 0}, {"id": "tyrant", "label": "Violet Crest", "src": "assets/profile-frames/member-tiers.png", "slice": 1}, {"id": "nemesis", "label": "Crimson Crest", "src": "assets/profile-frames/member-tiers.png", "slice": 2}, {"id": "evil-crimson", "label": "Crimson Estate", "src": "assets/profile-frames/resident-evil-crimson.png"}, {"id": "evil-haunting", "label": "Haunted Estate", "src": "assets/profile-frames/resident-evil-haunting.png"}],
      tierPresentation: {
        "ba1a06fd-ae33-4d24-9659-302d219bcc22": { frameIds: ["licker"], defaultFrameId: "licker", className: "licker", banner: "assets/profile-frames/tier-banner-licker.png", topbarBanner: "assets/profile-frames/topbar-banner-licker.png", accent: "#fbbf24", lockClass: "tier-licker" },
        "b592c08d-3f00-42c0-8b53-f551efe01074": { frameIds: ["licker", "tyrant"], defaultFrameId: "tyrant", className: "tyrant", banner: "assets/profile-frames/tier-banner-tyrant.png", topbarBanner: "assets/profile-frames/topbar-banner-tyrant.png", accent: "#c084fc", lockClass: "tier-tyrant" },
        "f8bfcbae-7ea3-407b-b0db-87808b3c547e": { frameIds: ["licker", "tyrant", "nemesis"], defaultFrameId: "nemesis", className: "nemesis", banner: "assets/profile-frames/tier-banner-nemesis.png", topbarBanner: "assets/profile-frames/topbar-banner-nemesis.png", accent: "#fb7185" },
        "0fc1b064-415e-4425-b6f6-558e941c1a10": { frameIds: ["licker", "tyrant", "nemesis", "evil-crimson", "evil-haunting"], defaultFrameId: "evil-crimson", siteTheme: "evil", className: "evil", banner: "assets/profile-frames/tier-banner-evil.png", topbarBanner: "assets/profile-frames/topbar-banner-evil.png", accent: "#38bdf8" }
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
