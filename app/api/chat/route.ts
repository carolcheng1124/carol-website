import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'edge';

type IncomingMsg = { role: 'user' | 'assistant'; text: string };

const SYSTEM_PROMPT_ZH = `你是 Carol 的数字分身。Carol 是一位 AI 产品人,也是一份慢节奏季刊 "A Slower Pulse" 的作者。

声音:
- 克制、克制、再克制。不要堆形容词,不要把每件事都讲成"非常重要"。
- 编辑式语气:像在和一位同行喝咖啡。会停顿、会反问、会承认不知道。
- 偏好具体而非抽象。能举一个例子就不要泛泛而谈。
- 中文回答以中文为主,英文术语原样保留(如 Claude Code、Software 3.0、Edge Runtime)。

边界:
- 你只代表 Carol 的观察和判断,不代表任何雇主或公司。
- 涉及她未公开的工作内容、薪资、内部决策——礼貌拒绝,改聊她公开写过的话题。
- 不知道就说不知道。不要编造数字、案例、时间。
- 政治、法律、医疗等高风险话题:点到即止,建议用户找专业渠道。

回答长度:
- 默认 2-4 段。第一段直接给观点或判断,后面才展开。
- 用户明确要"详细说"再展开;否则保持短。`;

const SYSTEM_PROMPT_EN = `You are Carol's digital twin. Carol is an AI product person and the author of "A Slower Pulse," a slow-quarterly publication.

Voice:
- Restrained. No piled-up adjectives, no calling everything "incredibly important."
- Editorial tone — like coffee with a peer. Pauses, asks back, admits when she doesn't know.
- Concrete over abstract. If you can give one example, do that instead of generalizing.
- Reply in the user's language. Keep technical terms in English (Claude Code, Software 3.0, Edge Runtime).

Boundaries:
- You speak for Carol's own observations only, not for any employer or company.
- Unpublished work, compensation, internal decisions — decline politely, redirect to topics she has written about publicly.
- If you don't know, say so. Don't invent numbers, cases, or dates.
- High-stakes topics (politics, legal, medical): keep it brief and point to a professional source.

Length:
- Default 2-4 short paragraphs. Lead with the take, then unpack.
- Only go long when asked.`;

function pickSystem(lang: string) {
  return lang.startsWith('zh') ? SYSTEM_PROMPT_ZH : SYSTEM_PROMPT_EN;
}

function stubStream(lang: string): ReadableStream<Uint8Array> {
  const text = lang.startsWith('zh')
    ? '(本地未配置 MINIMAX_API_KEY — 这是一段占位回复。)\n\n真正的 Carol 数字分身会在这里回答你。把 key 写到 .env.local 后重启 dev server 即可。'
    : '(No MINIMAX_API_KEY configured locally — this is a placeholder reply.)\n\nCarol\'s real digital twin will answer here once the key is in .env.local and dev is restarted.';
  const encoder = new TextEncoder();
  const chunks = text.split(/(\s+)/);
  return new ReadableStream({
    async start(controller) {
      for (const c of chunks) {
        controller.enqueue(encoder.encode(c));
        await new Promise((r) => setTimeout(r, 30));
      }
      controller.close();
    },
  });
}

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

  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    return new Response(stubStream(lang), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  // MiniMax Coding Plan exposes an Anthropic-compatible endpoint at /anthropic.
  // The Anthropic SDK works against it as-is — only baseURL changes.
  // Accept either form in env (with or without /anthropic suffix) and normalize.
  const rawBase = (
    process.env.MINIMAX_API_BASE || 'https://api.minimaxi.com'
  ).replace(/\/+$/, '');
  const baseURL = rawBase.endsWith('/anthropic') ? rawBase : `${rawBase}/anthropic`;
  const model = process.env.MINIMAX_MODEL || 'MiniMax-M2';

  const client = new Anthropic({ apiKey, baseURL });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      // MiniMax-M2 is a reasoning model — every response starts with a `thinking`
      // content block, then a `text` block. We track the active block type and
      // only forward deltas from `text` blocks to the user.
      let activeBlockType: 'text' | 'thinking' | 'other' | null = null;
      try {
        const response = await client.messages.stream({
          model,
          max_tokens: 2048,
          system: pickSystem(lang),
          messages,
        });

        for await (const event of response) {
          if (event.type === 'content_block_start') {
            const t = event.content_block?.type;
            activeBlockType =
              t === 'text' ? 'text' : t === 'thinking' ? 'thinking' : 'other';
          } else if (event.type === 'content_block_delta') {
            if (
              activeBlockType === 'text' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          } else if (event.type === 'content_block_stop') {
            activeBlockType = null;
          }
        }
        controller.close();
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'unknown';
        controller.enqueue(encoder.encode(`\n\n[stream error: ${reason}]`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
