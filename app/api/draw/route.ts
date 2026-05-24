// Image generation endpoint — routes /画 commands to MiniMax image-01.
// Distinct from /api/chat (text M2.7) so each provider stays simple.
export const runtime = 'nodejs';

const DEFAULT_BASE = 'https://api.minimaxi.com';
const PROMPT_MAX = 500;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: Request) {
  let body: { prompt?: string; lang?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const prompt = (body.prompt || '').trim();
  if (!prompt) return json({ error: 'prompt required' }, 400);
  if (prompt.length > PROMPT_MAX) {
    return json({ error: `prompt too long (max ${PROMPT_MAX} chars)` }, 400);
  }

  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    // Stub mode for local dev without a key — return a placeholder image so
    // the UI can be exercised end-to-end.
    return json({
      url: `https://placehold.co/768x768/FAF8F3/C8553D/png?text=${encodeURIComponent(prompt.slice(0, 40))}`,
      prompt,
      stub: true,
    });
  }

  // Image API lives on MiniMax's native path, NOT the /anthropic compat layer.
  const rawBase = (process.env.MINIMAX_API_BASE || DEFAULT_BASE)
    .replace(/\/+$/, '')
    .replace(/\/anthropic$/, '');
  const model = process.env.MINIMAX_IMAGE_MODEL || 'image-01';

  try {
    const res = await fetch(`${rawBase}/v1/image_generation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        aspect_ratio: '1:1',
        n: 1,
        response_format: 'url',
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return json(
        { error: `MiniMax ${res.status}: ${errText.slice(0, 300)}` },
        502,
      );
    }

    const data = (await res.json()) as Record<string, unknown>;

    // Defensive parsing — MiniMax response shape varies across endpoints.
    const candidates: unknown[] = [
      (data as { data?: { image_urls?: unknown } })?.data?.image_urls,
      (data as { image_urls?: unknown })?.image_urls,
      (data as { url?: unknown })?.url,
    ];
    let url: string | null = null;
    for (const c of candidates) {
      if (typeof c === 'string') {
        url = c;
        break;
      }
      if (Array.isArray(c) && typeof c[0] === 'string') {
        url = c[0];
        break;
      }
    }

    if (!url) {
      return json(
        {
          error: 'No image URL in response',
          raw: JSON.stringify(data).slice(0, 500),
        },
        502,
      );
    }

    return json({ url, prompt });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown';
    return json({ error: reason }, 500);
  }
}
