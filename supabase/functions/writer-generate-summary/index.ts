import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireEnv } from '../_shared/cors.ts';

const GOOGLE_API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';
const ALLOWED_MODELS = new Set(['gemma-4-26b-a4b-it', 'gemma-4-31b-it']);
const PROMPT_TEMPLATE_VERSION = 'writer-summary-v1';
const MAX_SOURCE_IDS = 100;
const MAX_PROMPT_CHARS = 900_000;
const MAX_INSTRUCTIONS_CHARS = 8_000;

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const uniqueIds = (value: unknown) => Array.isArray(value)
  ? [...new Set(value.filter((item) => typeof item === 'string' && /^[0-9a-f-]{36}$/i.test(item)))]
  : [];

function plainText(value: unknown) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n')
    .replace(/<hr[^>]*>/gi, '\n---\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function errorMessage(payload: any, fallback: string) {
  return text(payload?.error?.message) || text(payload?.message) || fallback;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, { status: 405 });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader) return json({ error: 'Sign in before using Summary Manager.' }, { status: 401 });

    const supabase = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: 'Unable to verify the signed-in Writer.' }, { status: 401 });
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
    if (adminError || isAdmin !== true) return json({ error: 'Summary Manager requires an admin account.' }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return json({ error: 'A JSON request body is required.' }, { status: 400 });

    const storyId = text(body.story_id);
    const summaryType = text(body.summary_type);
    const sourceIds = uniqueIds(body.source_ids);
    const styleReferenceId = text(body.style_reference_id) || null;
    const startChapter = Number(body.start_chapter);
    const endChapter = Number(body.end_chapter);
    const instructions = text(body.instructions).slice(0, MAX_INSTRUCTIONS_CHARS);
    const configuredModel = text(Deno.env.get('WRITER_SUMMARY_MODEL')) || 'gemma-4-26b-a4b-it';
    const model = text(body.model_id) || configuredModel;

    if (!/^[0-9a-f-]{36}$/i.test(storyId)) return json({ error: 'Choose a valid story.' }, { status: 400 });
    if (!['short', 'long'].includes(summaryType)) return json({ error: 'Summary type must be short or long.' }, { status: 400 });
    if (!Number.isInteger(startChapter) || startChapter < 1 || !Number.isInteger(endChapter) || endChapter < startChapter) {
      return json({ error: 'Choose a valid chapter coverage range.' }, { status: 400 });
    }
    if (!sourceIds.length || sourceIds.length > MAX_SOURCE_IDS) {
      return json({ error: `Choose between 1 and ${MAX_SOURCE_IDS} exact sources.` }, { status: 400 });
    }
    if (!ALLOWED_MODELS.has(model)) return json({ error: 'Choose a supported Gemma 4 model.' }, { status: 400 });

    let sourceSnapshot: Record<string, unknown>[] = [];
    let sourceSections = '';
    const expectedBlockType = summaryType === 'short' ? 'chapter_summary' : 'long_summary';

    if (summaryType === 'short') {
      const { data: chapters, error } = await supabase
        .from('chapters')
        .select('id, story_id, title, chapter_order, content, updated_at')
        .in('id', sourceIds)
        .order('chapter_order', { ascending: true });
      if (error) throw error;
      if ((chapters || []).length !== sourceIds.length || chapters?.some((chapter) => chapter.story_id !== storyId)) {
        return json({ error: 'Every source chapter must exist in the selected story.' }, { status: 400 });
      }
      sourceSnapshot = (chapters || []).map((chapter) => ({
        id: chapter.id,
        source_type: 'chapter',
        title: chapter.title,
        chapter_order: chapter.chapter_order,
        updated_at: chapter.updated_at,
      }));
      sourceSections = (chapters || []).map((chapter) =>
        `<<< FACTUAL SOURCE: CHAPTER ${chapter.chapter_order} — ${chapter.title || 'Untitled'} >>>\n${plainText(chapter.content)}\n<<< END CHAPTER ${chapter.chapter_order} >>>`
      ).join('\n\n');
    } else {
      const { data: blocks, error } = await supabase
        .from('writer_context_blocks')
        .select('id, story_id, title, block_type, content, updated_at')
        .in('id', sourceIds);
      if (error) throw error;
      if ((blocks || []).length !== sourceIds.length || blocks?.some((block) => block.story_id !== storyId || block.block_type !== 'chapter_summary')) {
        return json({ error: 'Every Long Summary source must be a Short Summary from the selected story.' }, { status: 400 });
      }
      const { data: detailRows, error: detailError } = await supabase
        .from('writer_summary_details')
        .select('context_block_id, status, start_chapter, end_chapter, accepted_at')
        .in('context_block_id', sourceIds);
      if (detailError) throw detailError;
      const details = new Map((detailRows || []).map((row) => [row.context_block_id, row]));
      if ((blocks || []).some((block) => details.has(block.id) && details.get(block.id)?.status !== 'accepted')) {
        return json({ error: 'Long Summaries can use only accepted Short Summaries.' }, { status: 400 });
      }
      const ordered = [...(blocks || [])].sort((a, b) => {
        const aStart = Number(details.get(a.id)?.start_chapter) || 0;
        const bStart = Number(details.get(b.id)?.start_chapter) || 0;
        return aStart - bStart || a.title.localeCompare(b.title);
      });
      sourceSnapshot = ordered.map((block) => ({
        id: block.id,
        source_type: 'short_summary',
        title: block.title,
        start_chapter: details.get(block.id)?.start_chapter ?? null,
        end_chapter: details.get(block.id)?.end_chapter ?? null,
        updated_at: block.updated_at,
        accepted_at: details.get(block.id)?.accepted_at ?? null,
        legacy: !details.has(block.id),
      }));
      sourceSections = ordered.map((block) =>
        `<<< FACTUAL SOURCE: ACCEPTED SHORT SUMMARY — ${block.title} >>>\n${plainText(block.content)}\n<<< END SHORT SUMMARY >>>`
      ).join('\n\n');
    }

    let styleSection = 'No style reference was selected.';
    if (styleReferenceId) {
      if (!/^[0-9a-f-]{36}$/i.test(styleReferenceId)) return json({ error: 'Invalid style reference.' }, { status: 400 });
      const { data: styleBlock, error } = await supabase
        .from('writer_context_blocks')
        .select('id, story_id, title, block_type, content, updated_at')
        .eq('id', styleReferenceId)
        .single();
      if (error || !styleBlock || styleBlock.story_id !== storyId || styleBlock.block_type !== expectedBlockType) {
        return json({ error: 'Style reference must be the same summary type and story.' }, { status: 400 });
      }
      const { data: styleDetails } = await supabase
        .from('writer_summary_details')
        .select('status')
        .eq('context_block_id', styleReferenceId)
        .maybeSingle();
      if (styleDetails && styleDetails.status !== 'accepted') {
        return json({ error: 'Style reference must be an accepted summary.' }, { status: 400 });
      }
      styleSection = [
        `STYLE REFERENCE ONLY — ${styleBlock.title}`,
        'Use only its organization, density, tense, tone, and level of detail.',
        'Never copy events, characters, facts, chronology, or claims from this reference unless they also appear in the factual sources below.',
        plainText(styleBlock.content),
        'END STYLE REFERENCE',
      ].join('\n');
    }

    const taskInstructions = summaryType === 'short'
      ? [
          'Create a detailed Short Summary covering the requested chapter range.',
          'Record consequential events, decisions, injuries, discoveries, relationship changes, locations, items, unresolved threats, and continuity facts.',
          'Preserve chronology and names. Do not invent or infer unsupported facts.',
          'The result may be detailed; it is a factual event log for future writing context.',
        ]
      : [
          'Create a compressed Long Summary covering the requested chapter range.',
          'Synthesize the accepted Short Summaries into a coherent high-level narrative record.',
          'Preserve major arcs, causality, character changes, important world facts, and unresolved threads.',
          'Remove repetition while never inventing unsupported facts.',
        ];

    const prompt = [
      'You are generating private continuity material for a fiction author.',
      ...taskInstructions,
      `Requested coverage: chapters ${startChapter} through ${endChapter}.`,
      instructions ? `Additional author instructions:\n${instructions}` : 'No additional author instructions.',
      '',
      styleSection,
      '',
      'FACTUAL SOURCES BEGIN',
      sourceSections,
      'FACTUAL SOURCES END',
      '',
      'Return only the finished summary. Do not add a preface, disclaimer, source list, or analysis.',
    ].join('\n\n');

    if (prompt.length > MAX_PROMPT_CHARS) {
      return json({ error: `Selected sources exceed the ${MAX_PROMPT_CHARS.toLocaleString()} character request limit.` }, { status: 413 });
    }

    const apiKey = requireEnv('GEMINI_API_KEY');
    const response = await fetch(`${GOOGLE_API_ROOT}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 16384,
          temperature: 0.4,
        },
      }),
      signal: req.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerMessage = errorMessage(payload, `Google generation failed (${response.status}).`);
      const friendly = response.status === 429
        ? `Google quota or rate limit reached. ${providerMessage}`
        : response.status === 400 && /free tier|region|country/i.test(providerMessage)
          ? `Google API access is unavailable for this project or region. ${providerMessage}`
          : providerMessage;
      return json({ error: friendly, provider_status: response.status }, { status: response.status || 502 });
    }

    const generatedText = (payload?.candidates?.[0]?.content?.parts || [])
      .map((part: any) => text(part?.text))
      .filter(Boolean)
      .join('\n')
      .trim();
    if (!generatedText) {
      const blockReason = payload?.promptFeedback?.blockReason || payload?.candidates?.[0]?.finishReason;
      return json({ error: blockReason ? `Google returned no summary (${blockReason}).` : 'Google returned an empty summary.' }, { status: 502 });
    }

    return json({
      text: generatedText,
      provider: 'google',
      model_id: model,
      prompt_template_version: PROMPT_TEMPLATE_VERSION,
      generated_at: new Date().toISOString(),
      source_snapshot: sourceSnapshot,
      generation_meta: {
        usage: payload?.usageMetadata || null,
        finish_reason: payload?.candidates?.[0]?.finishReason || null,
        source_count: sourceIds.length,
        prompt_characters: prompt.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Summary generation failed.';
    const configurationError = message.startsWith('Missing required environment variable:');
    return json(
      { error: configurationError ? 'Summary generation is not configured on the server.' : message },
      { status: configurationError ? 503 : 400 },
    );
  }
});
