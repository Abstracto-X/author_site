import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, optionalEnv, requireEnv } from '../_shared/cors.ts';

type QueueRow = {
  id: string;
  to_email: string;
  subject: string;
  body: string;
};

const sendWithResend = async (row: QueueRow) => {
  const apiKey = requireEnv('RESEND_API_KEY');
  const from = requireEnv('READER_EMAIL_FROM');
  const siteName = optionalEnv('READER_EMAIL_SITE_NAME', 'EvilArchives');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: row.to_email,
      subject: row.subject,
      text: row.body,
      html: `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.6;color:#151515"><h2>${row.subject}</h2><p>${row.body.replace(/\n/g, '<br>')}</p><hr><p style="color:#777;font-size:12px">Sent by ${siteName}. Manage notification preferences in your reader settings.</p></div>`,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json().catch(() => ({}));
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST required.' }, { status: 405 });

  try {
    const adminSecret = optionalEnv('READER_EMAIL_QUEUE_SECRET');
    if (adminSecret && req.headers.get('x-email-queue-secret') !== adminSecret) {
      return json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body.limit || 25), 1), 100);
    const admin = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'));

    const { data: rows, error } = await admin
      .from('reader_email_queue')
      .select('id,to_email,subject,body')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw error;

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];
    for (const row of (rows || []) as QueueRow[]) {
      try {
        await admin.from('reader_email_queue').update({ status: 'sending', error: null }).eq('id', row.id);
        await sendWithResend(row);
        await admin.from('reader_email_queue').update({ status: 'sent', sent_at: new Date().toISOString(), error: null }).eq('id', row.id);
        results.push({ id: row.id, ok: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Email send failed.';
        await admin.from('reader_email_queue').update({ status: 'error', error: message }).eq('id', row.id);
        results.push({ id: row.id, ok: false, error: message });
      }
    }

    return json({ ok: true, processed: results.length, results });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Email queue processing failed.' }, { status: 500 });
  }
});
