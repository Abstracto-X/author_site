-- Parent project schema compatibility layer.
-- Built from context/ORIGINAL_DATABASE_CONTEXT.md so admin.html can use the parent CMS schema.
-- Idempotent: safe to run more than once.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'node_type_enum') THEN
    CREATE TYPE public.node_type_enum AS ENUM ('folder', 'document', 'note', 'scene', 'chapter', 'image', 'map', 'lore');
  END IF;
END $$;

-- Existing core tables: add parent columns that this branch was missing.
ALTER TABLE IF EXISTS public.stories
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS synopsis TEXT,
  ADD COLUMN IF NOT EXISTS genre TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS background_image_url TEXT,
  ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#ffd700',
  ADD COLUMN IF NOT EXISTS loader_theme TEXT NOT NULL DEFAULT 'lightsaber',
  ADD COLUMN IF NOT EXISTS world_title TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.chapters
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS chapter_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS word_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.author_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform_name TEXT,
  url TEXT,
  icon_url TEXT,
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  role_title TEXT,
  biography TEXT,
  profile_image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.character_gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES public.characters(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL DEFAULT '',
  caption TEXT,
  image_tags TEXT[] NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.image_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_id UUID REFERENCES public.character_gallery_images(id) ON DELETE CASCADE,
  vote_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, image_id),
  CHECK (vote_value IN (-1, 1))
);

CREATE TABLE IF NOT EXISTS public.story_wallpapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL DEFAULT '',
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lore_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  slug TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.lore_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  slug TEXT,
  title TEXT NOT NULL DEFAULT '',
  category_id UUID REFERENCES public.lore_categories(id) ON DELETE SET NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  event_date TEXT,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  event_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.timeline_event_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.timeline_events(id) ON DELETE CASCADE,
  character_id UUID REFERENCES public.characters(id) ON DELETE CASCADE,
  UNIQUE(event_id, character_id)
);

CREATE TABLE IF NOT EXISTS public.maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  slug TEXT UNIQUE,
  map_name TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  width INTEGER,
  height INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  map_type TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID,
  target_type TEXT,
  content TEXT NOT NULL DEFAULT '',
  referenced_image_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.writer_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.writer_nodes(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT,
  type public.node_type_enum NOT NULL DEFAULT 'document',
  status TEXT NOT NULL DEFAULT 'outline',
  sort_order INTEGER NOT NULL DEFAULT 0,
  word_count INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.writer_node_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id UUID REFERENCES public.writer_nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES public.writer_nodes(id) ON DELETE CASCADE,
  link_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.map_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID REFERENCES public.maps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.map_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.map_requests(id) ON DELETE CASCADE,
  action TEXT,
  entity_type TEXT,
  entity_id UUID,
  proposed_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add any missing columns in case a table existed with a partial shape.
ALTER TABLE IF EXISTS public.author_links
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS platform_name TEXT,
  ADD COLUMN IF NOT EXISTS url TEXT,
  ADD COLUMN IF NOT EXISTS icon_url TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.site_settings
  ADD COLUMN IF NOT EXISTS setting_key TEXT,
  ADD COLUMN IF NOT EXISTS setting_value JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.characters
  ADD COLUMN IF NOT EXISTS story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS role_title TEXT,
  ADD COLUMN IF NOT EXISTS biography TEXT,
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.character_gallery_images
  ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES public.characters(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS image_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.story_wallpapers
  ADD COLUMN IF NOT EXISTS story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.lore_categories
  ADD COLUMN IF NOT EXISTS story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.lore_entries
  ADD COLUMN IF NOT EXISTS story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.lore_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.timeline_events
  ADD COLUMN IF NOT EXISTS story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS event_date TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS event_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.timeline_event_characters
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.timeline_events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES public.characters(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.maps
  ADD COLUMN IF NOT EXISTS story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS map_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS map_type TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Helpful parent-project indexes.
CREATE INDEX IF NOT EXISTS idx_stories_slug ON public.stories(slug);
CREATE INDEX IF NOT EXISTS idx_stories_published_sort ON public.stories(is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_chapters_story_order ON public.chapters(story_id, chapter_order);
CREATE INDEX IF NOT EXISTS idx_characters_story ON public.characters(story_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_character ON public.character_gallery_images(character_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_character_published ON public.character_gallery_images(character_id, is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_story_wallpapers_story ON public.story_wallpapers(story_id);
CREATE INDEX IF NOT EXISTS idx_lore_categories_story ON public.lore_categories(story_id);
CREATE INDEX IF NOT EXISTS idx_lore_story ON public.lore_entries(story_id);
CREATE INDEX IF NOT EXISTS idx_timeline_story_order ON public.timeline_events(story_id, event_order);
CREATE INDEX IF NOT EXISTS idx_maps_story ON public.maps(story_id);
CREATE INDEX IF NOT EXISTS idx_writer_nodes_story ON public.writer_nodes(story_id);
CREATE INDEX IF NOT EXISTS idx_writer_nodes_parent ON public.writer_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_node_links_source ON public.writer_node_links(source_node_id);
CREATE INDEX IF NOT EXISTS idx_node_links_target ON public.writer_node_links(target_node_id);
CREATE INDEX IF NOT EXISTS idx_map_requests_map ON public.map_requests(map_id);
CREATE INDEX IF NOT EXISTS idx_map_request_items_request ON public.map_request_items(request_id);

-- RLS and grants: public can read public/published surfaces; admins manage CMS data.
ALTER TABLE public.author_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_wallpapers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lore_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lore_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_event_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writer_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writer_node_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_request_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.author_links, public.site_settings, public.characters, public.character_gallery_images,
  public.story_wallpapers, public.lore_categories, public.lore_entries, public.timeline_events,
  public.timeline_event_characters, public.maps TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.author_links, public.site_settings, public.characters,
  public.character_gallery_images, public.image_votes, public.story_wallpapers, public.lore_categories,
  public.lore_entries, public.timeline_events, public.timeline_event_characters, public.maps, public.comments,
  public.writer_nodes, public.writer_node_links, public.map_requests, public.map_request_items TO authenticated;

-- Drop/recreate only this migration's policy names.
DO $$
DECLARE
  pol TEXT;
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['author_links','site_settings','characters','character_gallery_images','image_votes','story_wallpapers','lore_categories','lore_entries','timeline_events','timeline_event_characters','maps','comments','writer_nodes','writer_node_links','map_requests','map_request_items'] LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=tbl AND policyname LIKE 'parent_compat_%' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, tbl);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY parent_compat_author_links_public_read ON public.author_links FOR SELECT USING (TRUE);
CREATE POLICY parent_compat_author_links_admin_all ON public.author_links FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY parent_compat_site_settings_public_read ON public.site_settings FOR SELECT USING (TRUE);
CREATE POLICY parent_compat_site_settings_admin_all ON public.site_settings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY parent_compat_characters_public_read ON public.characters FOR SELECT USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = characters.story_id AND s.is_published = TRUE));
CREATE POLICY parent_compat_characters_admin_all ON public.characters FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY parent_compat_gallery_public_read ON public.character_gallery_images FOR SELECT USING (is_published = TRUE AND EXISTS (SELECT 1 FROM public.characters c JOIN public.stories s ON s.id = c.story_id WHERE c.id = character_gallery_images.character_id AND s.is_published = TRUE));
CREATE POLICY parent_compat_gallery_admin_all ON public.character_gallery_images FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY parent_compat_image_votes_public_read ON public.image_votes FOR SELECT USING (TRUE);
CREATE POLICY parent_compat_image_votes_own_insert ON public.image_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY parent_compat_image_votes_own_update ON public.image_votes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY parent_compat_image_votes_own_delete ON public.image_votes FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY parent_compat_wallpapers_public_read ON public.story_wallpapers FOR SELECT USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_wallpapers.story_id AND s.is_published = TRUE));
CREATE POLICY parent_compat_wallpapers_admin_all ON public.story_wallpapers FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY parent_compat_lore_categories_public_read ON public.lore_categories FOR SELECT USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = lore_categories.story_id AND s.is_published = TRUE));
CREATE POLICY parent_compat_lore_categories_admin_all ON public.lore_categories FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY parent_compat_lore_entries_public_read ON public.lore_entries FOR SELECT USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = lore_entries.story_id AND s.is_published = TRUE));
CREATE POLICY parent_compat_lore_entries_admin_all ON public.lore_entries FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY parent_compat_timeline_public_read ON public.timeline_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = timeline_events.story_id AND s.is_published = TRUE));
CREATE POLICY parent_compat_timeline_admin_all ON public.timeline_events FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY parent_compat_timeline_chars_public_read ON public.timeline_event_characters FOR SELECT USING (TRUE);
CREATE POLICY parent_compat_timeline_chars_admin_all ON public.timeline_event_characters FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY parent_compat_maps_public_read ON public.maps FOR SELECT USING (is_published = TRUE AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = maps.story_id AND s.is_published = TRUE));
CREATE POLICY parent_compat_maps_admin_all ON public.maps FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY parent_compat_comments_public_read ON public.comments FOR SELECT USING (TRUE);
CREATE POLICY parent_compat_comments_own_insert ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY parent_compat_comments_own_update ON public.comments FOR UPDATE USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY parent_compat_comments_own_delete ON public.comments FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY parent_compat_writer_nodes_admin_all ON public.writer_nodes FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY parent_compat_writer_links_admin_all ON public.writer_node_links FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY parent_compat_map_requests_own_read ON public.map_requests FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY parent_compat_map_requests_own_insert ON public.map_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY parent_compat_map_requests_admin_update ON public.map_requests FOR UPDATE USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY parent_compat_map_request_items_own_read ON public.map_request_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.map_requests r WHERE r.id = map_request_items.request_id AND (r.user_id = auth.uid() OR public.is_admin())));
CREATE POLICY parent_compat_map_request_items_own_insert ON public.map_request_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.map_requests r WHERE r.id = map_request_items.request_id AND r.user_id = auth.uid()));
CREATE POLICY parent_compat_map_request_items_admin_all ON public.map_request_items FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';
