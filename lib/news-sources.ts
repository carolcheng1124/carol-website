// =============================================================
// RSS 白名单 —— /news 唯一允许的抓取来源
// 严禁加入: X/Twitter、播客、付费墙站点(The Information / Stratechery)
// 调整这张表前确认: 是不是官方/合规的 RSS,要不要走"人工 curate 到
// /perspectives"而不是入这条管线。
// =============================================================

export type NewsSource = {
  /** 落库时写到 source 列,显示在 /news 列表 */
  name: string;
  /** RSS feed URL */
  feed: string;
  /** 发布方主页,落库时写到 source_url 列 */
  homepage: string;
  /** 主要语言 —— 列表里没有混合源,有就拆成两条 */
  lang: 'zh' | 'en';
};

export const NEWS_SOURCES: NewsSource[] = [
  // ---- 前沿实验室(英文) ----
  {
    name: 'OpenAI',
    feed: 'https://openai.com/news/rss.xml',
    homepage: 'https://openai.com/news',
    lang: 'en',
  },
  {
    name: 'Anthropic',
    feed: 'https://www.anthropic.com/news/rss.xml',
    homepage: 'https://www.anthropic.com/news',
    lang: 'en',
  },
  {
    name: 'Google DeepMind',
    feed: 'https://deepmind.google/blog/rss.xml',
    homepage: 'https://deepmind.google/discover/blog',
    lang: 'en',
  },
  {
    name: 'Meta AI',
    feed: 'https://ai.meta.com/blog/rss/',
    homepage: 'https://ai.meta.com/blog',
    lang: 'en',
  },
  {
    name: 'Hugging Face',
    feed: 'https://huggingface.co/blog/feed.xml',
    homepage: 'https://huggingface.co/blog',
    lang: 'en',
  },
  {
    name: 'arXiv cs.AI',
    feed: 'https://export.arxiv.org/rss/cs.AI',
    homepage: 'https://arxiv.org/list/cs.AI/recent',
    lang: 'en',
  },
  {
    name: 'Hacker News (AI)',
    feed: 'https://hnrss.org/newest?q=AI+OR+LLM+OR+GPT+OR+Claude&points=100',
    homepage: 'https://news.ycombinator.com',
    lang: 'en',
  },

  // ---- 中文实验室 ----
  {
    name: '月之暗面',
    feed: 'https://www.moonshot.cn/rss.xml',
    homepage: 'https://www.moonshot.cn',
    lang: 'zh',
  },
  {
    name: 'MiniMax',
    feed: 'https://www.minimax.io/news/rss',
    homepage: 'https://www.minimax.io/news',
    lang: 'zh',
  },
  {
    name: '智谱',
    feed: 'https://www.zhipuai.cn/rss.xml',
    homepage: 'https://www.zhipuai.cn',
    lang: 'zh',
  },
  {
    name: 'DeepSeek',
    feed: 'https://api-docs.deepseek.com/news/rss.xml',
    homepage: 'https://www.deepseek.com',
    lang: 'zh',
  },
];
