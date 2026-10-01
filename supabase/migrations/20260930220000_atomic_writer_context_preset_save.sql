-- Owner review required before applying. Replaces a Writer Context preset and
-- its selection in one PostgreSQL transaction; the browser currently uses
-- separate writes and must be switched to this RPC only after deployment.

CREATE OR REPLACE FUNCTION public.save_writer_context_preset(
    p_preset_id uuid,
    p_story_id uuid,
    p_name text,
    p_mode text,
    p_section_order jsonb,
    p_token_budget integer,
    p_active_section text,
    p_items jsonb
)
RETURNS public.writer_context_presets
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_preset public.writer_context_presets;
    v_item jsonb;
    v_type text;
    v_ref_id uuid;
    v_position integer := 0;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Admin privileges required' USING ERRCODE = '42501';
    END IF;
    IF p_story_id IS NULL OR NULLIF(btrim(p_name), '') IS NULL THEN
        RAISE EXCEPTION 'Story and preset name are required' USING ERRCODE = '22023';
    END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        RAISE EXCEPTION 'Preset items must be an array' USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(p_items) > 500 THEN
        RAISE EXCEPTION 'Preset items must be an array of at most 500 entries' USING ERRCODE = '22023';
    END IF;
    IF p_section_order IS NULL OR jsonb_typeof(p_section_order) <> 'array' THEN
        RAISE EXCEPTION 'Section order must be an array' USING ERRCODE = '22023';
    END IF;

    IF p_preset_id IS NULL THEN
        INSERT INTO public.writer_context_presets
            (story_id, name, mode, section_order, token_budget, active_section, updated_at)
        VALUES
            (p_story_id, btrim(p_name), p_mode, p_section_order, p_token_budget, p_active_section, now())
        RETURNING * INTO v_preset;
    ELSE
        UPDATE public.writer_context_presets
        SET name = btrim(p_name),
            mode = p_mode,
            section_order = p_section_order,
            token_budget = p_token_budget,
            active_section = p_active_section,
            updated_at = now()
        WHERE id = p_preset_id AND story_id = p_story_id
        RETURNING * INTO v_preset;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Preset not found in this story' USING ERRCODE = 'P0002';
        END IF;
        DELETE FROM public.writer_context_preset_items WHERE preset_id = v_preset.id;
    END IF;

    -- Preserve the caller's array order when assigning item positions.
    FOR v_item IN
        SELECT item.value
        FROM jsonb_array_elements(p_items) WITH ORDINALITY AS item(value, ordinal)
        ORDER BY item.ordinal
    LOOP
        IF jsonb_typeof(v_item) <> 'object' THEN
            RAISE EXCEPTION 'Each preset item must be an object' USING ERRCODE = '22023';
        END IF;
        v_type := v_item->>'item_type';
        IF v_type = 'context_block' THEN
            v_ref_id := (v_item->>'context_block_id')::uuid;
            IF NOT EXISTS (
                SELECT 1 FROM public.writer_context_blocks
                WHERE id = v_ref_id AND story_id = p_story_id
            ) THEN
                RAISE EXCEPTION 'Context block does not belong to this story' USING ERRCODE = '22023';
            END IF;
            INSERT INTO public.writer_context_preset_items
                (preset_id, item_type, context_block_id, position)
            VALUES (v_preset.id, v_type, v_ref_id, v_position);
        ELSIF v_type = 'chapter' THEN
            v_ref_id := (v_item->>'chapter_id')::uuid;
            IF NOT EXISTS (
                SELECT 1 FROM public.chapters
                WHERE id = v_ref_id AND story_id = p_story_id
            ) THEN
                RAISE EXCEPTION 'Chapter does not belong to this story' USING ERRCODE = '22023';
            END IF;
            INSERT INTO public.writer_context_preset_items
                (preset_id, item_type, chapter_id, position)
            VALUES (v_preset.id, v_type, v_ref_id, v_position);
        ELSIF v_type = 'scratchpad' THEN
            v_ref_id := (v_item->>'scratchpad_id')::uuid;
            IF NOT EXISTS (
                SELECT 1 FROM public.scratchpads AS note
                JOIN public.chapters AS chapter ON chapter.id = note.chapter_id
                WHERE note.id = v_ref_id AND chapter.story_id = p_story_id
            ) THEN
                RAISE EXCEPTION 'Chapter note does not belong to this story' USING ERRCODE = '22023';
            END IF;
            INSERT INTO public.writer_context_preset_items
                (preset_id, item_type, scratchpad_id, position)
            VALUES (v_preset.id, v_type, v_ref_id, v_position);
        ELSE
            RAISE EXCEPTION 'Unsupported preset item type' USING ERRCODE = '22023';
        END IF;
        v_position := v_position + 1;
    END LOOP;

    RETURN v_preset;
END;
$$;

REVOKE ALL ON FUNCTION public.save_writer_context_preset(
    uuid, uuid, text, text, jsonb, integer, text, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_writer_context_preset(
    uuid, uuid, text, text, jsonb, integer, text, jsonb
) TO authenticated;

NOTIFY pgrst, 'reload schema';
