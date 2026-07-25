import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireEnv } from '../_shared/cors.ts';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_MESSAGES = 120;
const MAX_TOTAL_CHARS = 500_000;

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const numberInRange = (value: unknown, minimum: number, maximum: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : undefined;
};

function validateMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) {
    throw new Error(`Messages must contain between 1 and ${MAX_MESSAGES} entries.`);
  }

  let totalChars = 0;
  const messages = value.map((entry) => {
    const role = text(entry?.role);
    const content = text(entry?.content);
    if (!['system', 'user', 'assistant'].includes(role) || !content) {
      throw new Error('Every message requires a supported role and non-empty text content.');
    }
    totalChars += content.length;
    return { role, content } as ChatMessage;
  });

  if (totalChars > MAX_TOTAL_CHARS) {
    throw new Error(`The conversation exceeds the ${MAX_TOTAL_CHARS.toLocaleString()} character limit.`);
  }
  return messages;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, { status: 405 });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader) return json({ error: 'Sign in before using Writer AI.' }, { status: 401 });

    const supabase = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: 'Unable to verify the signed-in Writer.' }, { status: 401 });

    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
    if (adminError || isAdmin !== true) return json({ error: 'Writer AI requires an admin account.' }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return json({ error: 'A JSON request body is required.' }, { status: 400 });

    const model = text(body.model);
    if (!model || model.length > 200 || !/^[a-z0-9._:/-]+$/i.test(model)) {
      return json({ error: 'Choose a valid OpenRouter model.' }, { status: 400 });
    }

    const messages = validateMessages(body.messages);
    const temperature = numberInRange(body.temperature, 0, 2);
    const topP = numberInRange(body.top_p, 0, 1);
    const maxTokens = numberInRange(body.max_tokens, 1, 32_768);

    const upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${requireEnv('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': text(Deno.env.get('WRITER_AI_SITE_URL')) || new URL(req.url).origin,
        'X-Title': text(Deno.env.get('WRITER_AI_APP_TITLE')) || 'Writer Studio',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        ...(temperature === undefined ? {} : { temperature }),
        ...(topP === undefined ? {} : { top_p: topP }),
        ...(maxTokens === undefined ? {} : { max_tokens: Math.floor(maxTokens) }),
      }),
      signal: req.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const errorBody = await upstream.json().catch(async () => ({ error: { message: await upstream.text() } }));
      const message = text(errorBody?.error?.message) || text(errorBody?.message) || `OpenRouter request failed (${upstream.status}).`;
      return json({ error: message, provider_status: upstream.status }, { status: upstream.status || 502 });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': upstream.headers.get('Content-Type') || 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
        ...(upstream.headers.get('X-Generation-Id')
          ? { 'X-Generation-Id': upstream.headers.get('X-Generation-Id')! }
          : {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Writer AI request failed.';
    const configurationError = message.startsWith('Missing required environment variable:');
    return json(
      { error: configurationError ? 'Writer AI is not configured on the server.' : message },
      { status: configurationError ? 503 : 400 },
    );
  }
});
