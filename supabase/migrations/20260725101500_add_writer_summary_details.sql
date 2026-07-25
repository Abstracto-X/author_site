-- Review-first metadata for Short and Long Summary context blocks.
CREATE TABLE IF NOT EXISTS public.writer_summary_details (
    context_block_id uuid PRIMARY KEY REFERENCES public.writer_context_blocks(id) ON DELETE CASCADE,
    summary_kind text NOT NULL CHECK (summary_kind IN ('short', 'long')),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'accepted', 'archived')),
    start_chapter integer CHECK (start_chapter IS NULL OR start_chapter > 0),
    end_chapter integer CHECK (end_chapter IS NULL OR end_chapter > 0),
    source_chapter_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
    source_summary_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
    style_reference_id uuid REFERENCES public.writer_context_blocks(id) ON DELETE SET NULL,
    provider text NOT NULL DEFAULT 'google',
    model_id text NOT NULL DEFAULT 'gemma-4-26b-a4b-it',
    prompt_template_version text NOT NULL DEFAULT 'writer-summary-v1',
    generation_instructions text NOT NULL DEFAULT '',
    source_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(source_snapshot) = 'array'),
    generation_meta jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(generation_meta) = 'object'),
    generated_at timestamp with time zone,
    accepted_at timestamp with time zone,
    archived_at timestamp with time zone,
    supersedes_summary_id uuid REFERENCES public.writer_context_blocks(id) ON DELETE SET NULL,
    created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT writer_summary_details_range_check CHECK (
        start_chapter IS NULL
        OR end_chapter IS NULL
        OR end_chapter >= start_chapter
    ),
    CONSTRAINT writer_summary_details_sources_check CHECK (
        (summary_kind = 'short' AND cardinality(source_summary_ids) = 0)
        OR (summary_kind = 'long' AND cardinality(source_chapter_ids) = 0)
    )
);

CREATE INDEX IF NOT EXISTS writer_summary_details_status_kind_idx
    ON public.writer_summary_details (status, summary_kind, updated_at DESC);

CREATE INDEX IF NOT EXISTS writer_summary_details_style_reference_idx
    ON public.writer_summary_details (style_reference_id)
    WHERE style_reference_id IS NOT NULL;

ALTER TABLE public.writer_summary_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS writer_summary_details_admin_all ON public.writer_summary_details;
CREATE POLICY writer_summary_details_admin_all ON public.writer_summary_details
    FOR ALL TO public USING (public.is_admin()) WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';
