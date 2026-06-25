
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'reader',
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_name', NEW.raw_user_meta_data->>'preferred_username'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  author_name TEXT,
  short_description TEXT,
  synopsis TEXT,
  description TEXT,
  genre TEXT,
  category TEXT,
  status TEXT DEFAULT 'ongoing',
  cover_image_url TEXT,
  cover_url TEXT,
  background_image_url TEXT,
  theme_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  chapter_order INTEGER NOT NULL DEFAULT 0,
  word_count INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stories_slug ON public.stories(slug);
CREATE INDEX IF NOT EXISTS idx_stories_published ON public.stories(is_published, created_at);
CREATE INDEX IF NOT EXISTS idx_chapters_story_order ON public.chapters(story_id, chapter_order);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.stories TO anon, authenticated;
GRANT SELECT ON public.chapters TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chapters TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS profiles_own_read ON public.profiles;
CREATE POLICY profiles_own_read ON public.profiles FOR SELECT USING (id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS profiles_own_update ON public.profiles;
CREATE POLICY profiles_own_update ON public.profiles FOR UPDATE USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS stories_public_published_select ON public.stories;
CREATE POLICY stories_public_published_select ON public.stories FOR SELECT USING (is_published = TRUE OR public.is_admin());
DROP POLICY IF EXISTS stories_admin_all ON public.stories;
CREATE POLICY stories_admin_all ON public.stories FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
