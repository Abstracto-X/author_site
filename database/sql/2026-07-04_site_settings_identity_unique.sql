-- Keep global site settings production-safe: one row per setting key.
CREATE UNIQUE INDEX IF NOT EXISTS site_settings_setting_key_key
    ON public.site_settings(setting_key);

NOTIFY pgrst, 'reload schema';
