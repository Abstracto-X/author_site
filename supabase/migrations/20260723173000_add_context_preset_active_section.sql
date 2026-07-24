ALTER TABLE public.writer_context_presets
    ADD COLUMN IF NOT EXISTS active_section text NOT NULL DEFAULT 'writing_style';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'writer_context_presets_active_section_check'
          AND conrelid = 'public.writer_context_presets'::regclass
    ) THEN
        ALTER TABLE public.writer_context_presets
            ADD CONSTRAINT writer_context_presets_active_section_check
            CHECK (active_section IN (
                'writing_style',
                'long_summary',
                'chapter_summary',
                'chapter',
                'outline',
                'scratchpad'
            ));
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
