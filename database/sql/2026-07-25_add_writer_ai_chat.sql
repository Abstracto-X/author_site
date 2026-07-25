-- Story-scoped, admin-only Writer AI chat history.
CREATE TABLE IF NOT EXISTS public.writer_ai_chat_threads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL DEFAULT 'New chat' CHECK (char_length(title) BETWEEN 1 AND 160),
    model_id text NOT NULL DEFAULT 'openrouter/auto' CHECK (char_length(model_id) BETWEEN 1 AND 200),
    settings jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(settings) = 'object'),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS writer_ai_chat_threads_story_updated_idx
    ON public.writer_ai_chat_threads (story_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.writer_ai_chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id uuid NOT NULL REFERENCES public.writer_ai_chat_threads(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
    content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500000),
    sequence integer NOT NULL CHECK (sequence >= 0),
    model_id text CHECK (model_id IS NULL OR char_length(model_id) BETWEEN 1 AND 200),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (thread_id, sequence)
);

CREATE INDEX IF NOT EXISTS writer_ai_chat_messages_thread_sequence_idx
    ON public.writer_ai_chat_messages (thread_id, sequence);

ALTER TABLE public.writer_ai_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writer_ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS writer_ai_chat_threads_admin_all ON public.writer_ai_chat_threads;
CREATE POLICY writer_ai_chat_threads_admin_all ON public.writer_ai_chat_threads
    FOR ALL TO public USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS writer_ai_chat_messages_admin_all ON public.writer_ai_chat_messages;
CREATE POLICY writer_ai_chat_messages_admin_all ON public.writer_ai_chat_messages
    FOR ALL TO public USING (public.is_admin()) WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';
