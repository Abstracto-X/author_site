-- Reader notifications, notification preferences, profile customization helpers,
-- and chapter-publish fanout.

BEGIN;

CREATE TABLE IF NOT EXISTS public.reader_notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  browser_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  new_chapters_enabled boolean NOT NULL DEFAULT true,
  minimum_tier_rank integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reader_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
  notification_type text NOT NULL DEFAULT 'chapter',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  url text,
  required_tier_id uuid REFERENCES public.reader_access_tiers(id) ON DELETE SET NULL,
  required_tier_rank integer NOT NULL DEFAULT 0,
  read_at timestamptz,
  dismissed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, chapter_id, notification_type)
);

CREATE TABLE IF NOT EXISTS public.reader_email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.reader_notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, user_id)
);

ALTER TABLE public.reader_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reader_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reader_email_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reader_notification_preferences_own_read ON public.reader_notification_preferences;
DROP POLICY IF EXISTS reader_notification_preferences_own_upsert ON public.reader_notification_preferences;
DROP POLICY IF EXISTS reader_notification_preferences_admin_all ON public.reader_notification_preferences;
DROP POLICY IF EXISTS reader_notifications_own_read ON public.reader_notifications;
DROP POLICY IF EXISTS reader_notifications_own_update ON public.reader_notifications;
DROP POLICY IF EXISTS reader_notifications_admin_all ON public.reader_notifications;
DROP POLICY IF EXISTS reader_email_queue_admin_all ON public.reader_email_queue;

CREATE POLICY reader_notification_preferences_own_read
ON public.reader_notification_preferences FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY reader_notification_preferences_own_upsert
ON public.reader_notification_preferences FOR ALL
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY reader_notification_preferences_admin_all
ON public.reader_notification_preferences FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY reader_notifications_own_read
ON public.reader_notifications FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY reader_notifications_own_update
ON public.reader_notifications FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY reader_notifications_admin_all
ON public.reader_notifications FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY reader_email_queue_admin_all
ON public.reader_email_queue FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS reader_notifications_user_created_idx
ON public.reader_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS reader_email_queue_status_created_idx
ON public.reader_email_queue(status, created_at);

CREATE OR REPLACE FUNCTION public.touch_reader_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS touch_reader_notification_preferences ON public.reader_notification_preferences;
CREATE TRIGGER touch_reader_notification_preferences
BEFORE UPDATE ON public.reader_notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.touch_reader_notification_preferences();

CREATE OR REPLACE FUNCTION public.enqueue_chapter_publish_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  story_row public.stories%ROWTYPE;
  required_rank integer := 0;
  notification_row public.reader_notifications%ROWTYPE;
  reader record;
  chapter_url text;
BEGIN
  IF NEW.is_published IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.is_published, false) IS TRUE
     AND OLD.title IS NOT DISTINCT FROM NEW.title
     AND OLD.required_tier_id IS NOT DISTINCT FROM NEW.required_tier_id THEN
    RETURN NEW;
  END IF;

  SELECT * INTO story_row FROM public.stories WHERE id = NEW.story_id AND is_published = true;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW.required_tier_id IS NOT NULL THEN
    SELECT COALESCE(tier_rank, 0) INTO required_rank
    FROM public.reader_access_tiers
    WHERE id = NEW.required_tier_id;
  END IF;

  chapter_url := '#/read/' || NEW.id::text;

  FOR reader IN
    SELECT
      p.id AS user_id,
      p.role,
      u.email,
      COALESCE(pref.browser_enabled, true) AS browser_enabled,
      COALESCE(pref.email_enabled, true) AS email_enabled,
      COALESCE(pref.new_chapters_enabled, true) AS new_chapters_enabled,
      COALESCE(pref.minimum_tier_rank, 0) AS minimum_tier_rank
    FROM public.profiles p
    LEFT JOIN public.reader_notification_preferences pref ON pref.user_id = p.id
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE COALESCE(pref.new_chapters_enabled, true) = true
      AND COALESCE(pref.minimum_tier_rank, 0) <= required_rank
      AND (
        NEW.required_tier_id IS NULL
        OR p.role = 'admin'
        OR public.has_active_entitlement(p.id, NEW.required_tier_id)
      )
  LOOP
    INSERT INTO public.reader_notifications(
      user_id, story_id, chapter_id, notification_type, title, body, url,
      required_tier_id, required_tier_rank, metadata
    )
    VALUES (
      reader.user_id,
      NEW.story_id,
      NEW.id,
      'chapter',
      'New chapter: ' || NEW.title,
      story_row.title || ' has a new chapter ready for your access tier.',
      chapter_url,
      NEW.required_tier_id,
      required_rank,
      jsonb_build_object('story_slug', story_row.slug, 'chapter_order', NEW.chapter_order)
    )
    ON CONFLICT (user_id, chapter_id, notification_type) DO UPDATE
    SET title = EXCLUDED.title,
        body = EXCLUDED.body,
        url = EXCLUDED.url,
        required_tier_id = EXCLUDED.required_tier_id,
        required_tier_rank = EXCLUDED.required_tier_rank,
        metadata = EXCLUDED.metadata
    RETURNING * INTO notification_row;

    IF reader.email_enabled AND reader.email IS NOT NULL AND position('@' in reader.email) > 1 THEN
      INSERT INTO public.reader_email_queue(notification_id, user_id, to_email, subject, body)
      VALUES (
        notification_row.id,
        reader.user_id,
        reader.email,
        notification_row.title,
        notification_row.body || E'\n\nOpen: ' || chapter_url
      )
      ON CONFLICT (notification_id, user_id) DO UPDATE
      SET to_email = EXCLUDED.to_email,
          subject = EXCLUDED.subject,
          body = EXCLUDED.body,
          status = CASE WHEN public.reader_email_queue.status = 'sent' THEN public.reader_email_queue.status ELSE 'queued' END,
          error = NULL;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS chapter_publish_notifications ON public.chapters;
CREATE TRIGGER chapter_publish_notifications
AFTER INSERT OR UPDATE OF is_published, title, required_tier_id ON public.chapters
FOR EACH ROW EXECUTE FUNCTION public.enqueue_chapter_publish_notifications();

NOTIFY pgrst, 'reload schema';

COMMIT;
