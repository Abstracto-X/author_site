-- Phase 1-2: story-level context blocks and reusable prompt presets for Writer Studio.
CREATE TABLE IF NOT EXISTS public.writer_context_blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    block_type text NOT NULL CHECK (
        block_type IN ('writing_style', 'long_summary', 'chapter_summary', 'outline', 'scratchpad')
    ),
    title text NOT NULL,
    content text NOT NULL DEFAULT '',
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS writer_context_blocks_story_type_order_idx
    ON public.writer_context_blocks (story_id, block_type, sort_order, created_at);

CREATE TABLE IF NOT EXISTS public.writer_context_presets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    name text NOT NULL,
    mode text NOT NULL DEFAULT 'simple' CHECK (mode IN ('simple', 'advanced')),
    section_order jsonb NOT NULL DEFAULT
        '["writing_style","long_summary","chapter_summary","chapter","outline","scratchpad"]'::jsonb,
    token_budget integer NOT NULL DEFAULT 32000 CHECK (token_budget BETWEEN 1000 AND 2000000),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (story_id, name)
);

CREATE INDEX IF NOT EXISTS writer_context_presets_story_name_idx
    ON public.writer_context_presets (story_id, name);

CREATE TABLE IF NOT EXISTS public.writer_context_preset_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    preset_id uuid NOT NULL REFERENCES public.writer_context_presets(id) ON DELETE CASCADE,
    item_type text NOT NULL CHECK (item_type IN ('context_block', 'chapter', 'scratchpad')),
    context_block_id uuid REFERENCES public.writer_context_blocks(id) ON DELETE CASCADE,
    chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
    scratchpad_id uuid REFERENCES public.scratchpads(id) ON DELETE CASCADE,
    position integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT writer_context_preset_items_one_reference CHECK (
        num_nonnulls(context_block_id, chapter_id, scratchpad_id) = 1
        AND (item_type <> 'context_block' OR context_block_id IS NOT NULL)
        AND (item_type <> 'chapter' OR chapter_id IS NOT NULL)
        AND (item_type <> 'scratchpad' OR scratchpad_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS writer_context_preset_items_preset_position_idx
    ON public.writer_context_preset_items (preset_id, position);

ALTER TABLE public.writer_context_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writer_context_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writer_context_preset_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS writer_context_blocks_admin_all ON public.writer_context_blocks;
CREATE POLICY writer_context_blocks_admin_all ON public.writer_context_blocks
    FOR ALL TO public USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS writer_context_presets_admin_all ON public.writer_context_presets;
CREATE POLICY writer_context_presets_admin_all ON public.writer_context_presets
    FOR ALL TO public USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS writer_context_preset_items_admin_all ON public.writer_context_preset_items;
CREATE POLICY writer_context_preset_items_admin_all ON public.writer_context_preset_items
    FOR ALL TO public USING (public.is_admin()) WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';
