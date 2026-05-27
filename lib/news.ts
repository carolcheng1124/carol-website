// Schema for a news item — mirrors the planned Postgres `news_items` table.
// During P1 we serve mock data so the route + visual ships before the cron
// pipeline lands. swap to a real DB read once `news_items` exists.

export type NewsItem = {
  id: string;          // future: postgres serial_id; today: stable mock id
  source: string;      // human label e.g. "OpenAI" / "Anthropic" / "arXiv"
  sourceUrl: string;   // homepage of the publisher
  title: string;       // original article title
  url: string;         // canonical link to the article
  summary: string;     // one-paragraph extract or hand-written summary
  publishedAt: string; // ISO YYYY-MM-DD
  lang: 'zh' | 'en';   // primary language of the source
  aiTake?: string;     // 🤖 来自姗姗的 AI 分身 — populated by /api/twin-take in P2
};

// Mock data for P1 visual scaffolding. Replace with `getNewsItems` reading
// `news_items` table once Vercel Cron + RSS pipeline ships.
const MOCK: NewsItem[] = [
  {
    id: 'mock-1',
    source: 'Anthropic',
    sourceUrl: 'https://www.anthropic.com/news',
    title: 'Claude Opus 4.7 — extended thinking on by default',
    url: 'https://www.anthropic.com/news/claude-opus-4-7',
    summary:
      'Anthropic 把 extended thinking 设为 Opus 4.7 的默认开关；Sonnet 4.6 同步小幅升级。pricing 不变,但 thinking budget 计入 output token。',
    publishedAt: '2026-05-26',
    lang: 'en',
  },
  {
    id: 'mock-2',
    source: 'OpenAI',
    sourceUrl: 'https://openai.com/blog',
    title: 'GPT-5.5 Mini API now generally available',
    url: 'https://openai.com/blog/gpt-5-5-mini-ga',
    summary:
      'GPT-5.5 Mini 转 GA, 单价比 GPT-5 便宜约 60%, context 同样到 1M tokens。tool-use 延迟 p50 < 800ms。',
    publishedAt: '2026-05-26',
    lang: 'en',
  },
  {
    id: 'mock-3',
    source: 'Google DeepMind',
    sourceUrl: 'https://deepmind.google/discover/blog',
    title: 'Gemini 3 Flash hits new SOTA on long-context retrieval',
    url: 'https://deepmind.google/discover/blog/gemini-3-flash-long-context',
    summary:
      'Gemini 3 Flash 在 NIAH 1M context 100% 召回, 价格比上一代便宜 35%。Workspace 集成本周开始 rollout。',
    publishedAt: '2026-05-25',
    lang: 'en',
  },
  {
    id: 'mock-4',
    source: '月之暗面',
    sourceUrl: 'https://www.moonshot.cn',
    title: 'Kimi K2.5 开放 1M context 公测,推理能力对标 Opus',
    url: 'https://www.moonshot.cn/blog/kimi-k2-5',
    summary:
      'Moonshot 发布 Kimi K2.5 公测版,1M context, agent benchmark SWE-bench 56%。API 限额暂时按邀请制。',
    publishedAt: '2026-05-25',
    lang: 'zh',
  },
  {
    id: 'mock-5',
    source: 'arXiv cs.AI',
    sourceUrl: 'https://arxiv.org/list/cs.AI/recent',
    title: 'Reward Hacking is Solvable: A Bayesian Approach to RLHF Specification',
    url: 'https://arxiv.org/abs/2605.12345',
    summary:
      '一篇来自 DeepMind + Berkeley 的论文,提出用 Bayesian inference 把 reward model 不确定性显式建模, 在 4 个 alignment 任务上比 standard RLHF 减少 reward hacking 67%。',
    publishedAt: '2026-05-24',
    lang: 'en',
  },
  {
    id: 'mock-6',
    source: 'Hugging Face',
    sourceUrl: 'https://huggingface.co/blog',
    title: 'Open Model Initiative: 10 labs commit to truly open weights + data',
    url: 'https://huggingface.co/blog/open-model-initiative',
    summary:
      'HuggingFace 联合 10 家研究室(包括 EleutherAI, AllenAI, BigScience)成立 OMI, 承诺模型权重 + 训练数据 + 训练代码全开源。',
    publishedAt: '2026-05-23',
    lang: 'en',
  },
];

export function getNewsItems(): NewsItem[] {
  return [...MOCK].sort((a, b) =>
    a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0,
  );
}

export function getNewsItem(id: string): NewsItem | null {
  return MOCK.find((n) => n.id === id) ?? null;
}
