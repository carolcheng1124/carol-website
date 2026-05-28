// =============================================================
// RSS 白名单 —— /news 唯一允许的抓取来源
//
// 严禁加入: X/Twitter、播客、付费墙站点(The Information / Stratechery)
//
// 中文 AI 厂(月之暗面 / MiniMax / 智谱 / DeepSeek / 通义)普遍不开博客 RSS。
// 探测结论(2026-05-29):
//   - 模型 repo(Qwen3 / Kimi-K2 / Kimi-VL...)在 GitHub 不发 Release,全部 0 entries
//   - 工具 repo 里只有 MoonshotAI/kimi-cli 是周更 + 全 STABLE,信号干净 → 入白名单
//   - QwenLM/qwen-code 8/10 是 nightly preview,会污染 /news;MoonshotAI/kimi-code 几乎日更,
//     也会刷屏 —— 都 skip
//   - 其余中文模型动态 + Seedance(字节闭源视频,无 repo)统一走 /perspectives 人工 curate
//
// Anthropic 没有官方 RSS。当前借用第三方仓库 Olshansk/rss-feeds
// (用 Claude 自动生成)的 raw feed。**这是依赖**:
// 如果哪天作者停维护,需要切换方案(改为 /perspectives 人工 curate,
// 或自建 scraper)。监控锚点:跑一次 cron 后看是否仍然 inserted > 0。
//
// Meta AI 也没官方 RSS,Olshansk 的 Meta AI feed 内容也已陈旧
// (最新一篇 2026-04-08,11 周没动 —— 估计 Olshansk 的 Meta 抓取器坏了),
// 已从白名单移除,完全走 /perspectives 人工 curate。
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
    // 官方无 RSS,用 Olshansk/rss-feeds generated feed(2026-05 起依赖)
    name: 'Anthropic',
    feed: 'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml',
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

  // ---- 中文厂(唯一干净的 GitHub Release 源) ----
  // 注: 模型本身的 release(Kimi-K2/VL/Audio)在 GitHub 上不存在,只有 CLI 发版
  {
    name: 'Kimi',
    feed: 'https://github.com/MoonshotAI/kimi-cli/releases.atom',
    homepage: 'https://github.com/MoonshotAI/kimi-cli',
    lang: 'zh',
  },
];
