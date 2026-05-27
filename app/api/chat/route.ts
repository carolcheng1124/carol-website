import { chatStream, type IncomingMsg } from '@/lib/twin';

// Node.js runtime: the Anthropic SDK uses node:crypto / node:stream
// internally, which Vercel's Edge runtime forbids.
export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: { lang?: string; messages?: IncomingMsg[] };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const lang = typeof body.lang === 'string' ? body.lang : 'en';
  const incoming = Array.isArray(body.messages) ? body.messages : [];

  const messages = incoming
    .filter(
      (m) =>
        m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string',
    )
    .map((m) => ({ role: m.role, content: m.text.slice(0, 4000) }))
    .slice(-12);

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return new Response('Last message must be from user', { status: 400 });
  }

  return new Response(chatStream(lang, messages), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
