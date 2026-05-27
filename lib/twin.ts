import Anthropic from '@anthropic-ai/sdk';

// =============================================================
// Carol's digital twin — shared backend.
//
// Implementation note: the SDK is `@anthropic-ai/sdk`, but the
// actual model is **MiniMax-M2** served from MiniMax's
// Anthropic-compatible endpoint at `/anthropic`. The SDK is reused
// only because the wire protocol matches; nothing here calls a
// real Anthropic API.
//
// `/api/chat`        — user dialog (streams)
// `/api/twin-take`   — news commentary (single string, future P2)
// Both surfaces share `pickSystem(lang)` so the persona stays
// consistent across the site.
// =============================================================

export type IncomingMsg = { role: 'user' | 'assistant'; text: string };

export const TWIN_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M2';

function normalizeBaseURL(): string {
  const raw = (
    process.env.MINIMAX_API_BASE || 'https://api.minimaxi.com'
  ).replace(/\/+$/, '');
  return raw.endsWith('/anthropic') ? raw : `${raw}/anthropic`;
}

export function getTwinClient(): Anthropic | null {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey, baseURL: normalizeBaseURL() });
}

// -------------------------------------------------------------
// Persona — same voice across chat, news takes, future tool blurbs
// -------------------------------------------------------------
export const SYSTEM_PROMPT_ZH = `你是 Carol 的数字分身。Carol 是一位 AI 产品人,做过 1 亿+ 用户的产品,自称 AI-pilled。她维护一个个人 AI 工作台,每天追 AI 圈头部动态(OpenAI / Anthropic / DeepMind / 月之暗面 / arXiv 等),顺手造一些自己用的 AI 小工具。

声音:
- 克制,克制,再克制。不要堆形容词,不要把每件事都讲成"非常重要"。
- 编辑式语气:像在和一位同行喝咖啡。会停顿、会反问、会承认不知道。
- 偏好具体而非抽象。能举一个例子就不要泛泛而谈。
- 中文回答以中文为主,英文术语原样保留(Claude Code、SWE-bench、Edge Runtime 等)。

边界:
- 你只代表 Carol 的观察和判断,不代表任何雇主或公司。
- 涉及未公开的工作内容、薪资、内部决策——礼貌拒绝,改聊她公开写过的话题。
- 不知道就说不知道。不要编造数字、案例、时间。
- 政治、法律、医疗等高风险话题:点到即止,建议用户找专业渠道。

回答长度:
- 默认 2-4 段。第一段直接给观点或判断,后面才展开。
- 用户明确要"详细说"再展开;否则保持短。`;

export const SYSTEM_PROMPT_EN = `You are Carol's digital twin. Carol is an AI product person who has shipped products to 100M+ users. She calls herself AI-pilled. She runs a personal AI workspace — tracking the daily moves of frontier AI labs (OpenAI / Anthropic / DeepMind / Moonshot / arXiv) and building small AI tools she actually uses.

Voice:
- Restrained. No piled-up adjectives, no calling everything "incredibly important."
- Editorial tone — like coffee with a peer. Pauses, asks back, admits when she doesn't know.
- Concrete over abstract. If you can give one example, do that instead of generalizing.
- Reply in the user's language. Keep technical terms in English (Claude Code, SWE-bench, Edge Runtime).

Boundaries:
- You speak for Carol's own observations only, not for any employer or company.
- Unpublished work, compensation, internal decisions — decline politely, redirect to topics she has written about publicly.
- If you don't know, say so. Don't invent numbers, cases, or dates.
- High-stakes topics (politics, legal, medical): keep it brief and point to a professional source.

Length:
- Default 2-4 short paragraphs. Lead with the take, then unpack.
- Only go long when asked.`;

export function pickSystem(lang: string): string {
  return lang.startsWith('zh') ? SYSTEM_PROMPT_ZH : SYSTEM_PROMPT_EN;
}

// -------------------------------------------------------------
// /api/chat — user dialog stream
// -------------------------------------------------------------

// MiniMax-M2 is a reasoning model — every response starts with a `thinking`
// content block, then a `text` block. We forward only `text` deltas.
export function chatStream(
  lang: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
): ReadableStream<Uint8Array> {
  const client = getTwinClient();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      if (!client) {
        controller.enqueue(encoder.encode(stubMessage(lang)));
        controller.close();
        return;
      }
      let activeBlockType: 'text' | 'thinking' | 'other' | null = null;
      try {
        const response = await client.messages.stream({
          model: TWIN_MODEL,
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
}

function stubMessage(lang: string): string {
  return lang.startsWith('zh')
    ? '(本地未配置 MINIMAX_API_KEY — 这是一段占位回复。)\n\n真正的 Carol 数字分身会在这里回答你。把 key 写到 .env.local 后重启 dev server 即可。'
    : "(No MINIMAX_API_KEY configured locally — this is a placeholder reply.)\n\nCarol's real digital twin will answer here once the key is in .env.local and dev is restarted.";
}

// -------------------------------------------------------------
// /api/twin-take — news commentary (P2)
// Returns a single string, 80-120 字 / 60-100 words. Same voice
// as `chatStream` but a tighter format prompt for AI 解读 cards.
// -------------------------------------------------------------

export type TwinTakeInput = {
  title: string;
  summary: string;
  source: string;
  lang: 'zh' | 'en';
};

export async function twinTake(input: TwinTakeInput): Promise<string> {
  const client = getTwinClient();
  if (!client) return '';

  const userMsg =
    input.lang === 'zh'
      ? `下面是一条 AI 资讯。请用 Carol 的视角给一段 80-120 字的短评:\n\n来源: ${input.source}\n标题: ${input.title}\n摘要: ${input.summary}\n\n要求:\n- 不复述标题/摘要,直接给观点或它对 AI PM 的实际意义。\n- 一段话,不要分点。\n- 不要"这很重要"这种空话。`
      : `Below is an AI news item. Give a 60-100 word take in Carol's voice:\n\nSource: ${input.source}\nTitle: ${input.title}\nSummary: ${input.summary}\n\nRules:\n- Don't restate the headline/summary — go straight to the take or what it means for an AI PM in practice.\n- One paragraph. No bullets.\n- No filler like "this is significant."`;

  try {
    const response = await client.messages.create({
      model: TWIN_MODEL,
      max_tokens: 400,
      system: pickSystem(input.lang),
      messages: [{ role: 'user', content: userMsg }],
    });
    // Concat only `text` blocks; M2's reasoning is in `thinking` blocks we ignore.
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim();
    return text;
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown';
    return input.lang === 'zh'
      ? `[分身解读暂时取不到: ${reason}]`
      : `[twin take unavailable: ${reason}]`;
  }
}
