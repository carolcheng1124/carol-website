import { XMLParser } from 'fast-xml-parser';
import type { NewsSource } from './news-sources';

// =============================================================
// RSS 抓取 + 解析
//
// 支持 RSS 2.0 (<rss><channel><item>) 和 Atom (<feed><entry>) 两种格式。
// 不做 fallback 到 HTML 爬取 —— RSS 拿不到就跳过这个源,等下次 cron。
// =============================================================

export type ParsedItem = {
  source: string;
  sourceUrl: string;
  url: string;
  title: string;
  summary: string;
  publishedAt: string; // ISO 8601
  lang: 'zh' | 'en';
};

// 单个源最多取多少条 —— 防止某个源刷屏
const PER_SOURCE_LIMIT = 8;
// fetch 超时 —— RSS 服务器卡住时不能拖垮整个 cron
const FETCH_TIMEOUT_MS = 15_000;
// 只入库最近 N 天的内容 —— 第一次跑不要把陈年旧文一次性灌进来
const FRESH_DAYS = 14;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // RSS 里 <description> 经常是 CDATA 包裹的 HTML,parser 会自动剥 CDATA
});

export async function fetchAndParseFeed(
  source: NewsSource,
): Promise<ParsedItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(source.feed, {
      signal: controller.signal,
      headers: {
        // 部分源(arxiv、moonshot)对默认 UA 不友好
        'User-Agent': 'carol-website-cron/1.0 (+https://carol.run)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8',
      },
      // Vercel cron 跑在 Node runtime,默认不缓存
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const xml = await res.text();
    const parsed = parser.parse(xml);

    const items = extractItems(parsed, source).slice(0, PER_SOURCE_LIMIT);

    const cutoff = Date.now() - FRESH_DAYS * 86_400_000;
    return items.filter((item) => {
      const t = new Date(item.publishedAt).getTime();
      return Number.isFinite(t) && t >= cutoff;
    });
  } finally {
    clearTimeout(timer);
  }
}

// -------------------------------------------------------------
// RSS 2.0 / Atom 抽取
// -------------------------------------------------------------
function extractItems(parsed: unknown, source: NewsSource): ParsedItem[] {
  const root = parsed as Record<string, unknown>;

  // RSS 2.0: <rss><channel><item>...
  const rss = root.rss as Record<string, unknown> | undefined;
  if (rss && typeof rss === 'object') {
    const channel = rss.channel as Record<string, unknown> | undefined;
    const items = toArray<Record<string, unknown>>(channel?.item);
    return items
      .map((item) => rssItemToParsed(item, source))
      .filter((x): x is ParsedItem => x !== null);
  }

  // Atom: <feed><entry>...
  const feed = root.feed as Record<string, unknown> | undefined;
  if (feed && typeof feed === 'object') {
    const entries = toArray<Record<string, unknown>>(feed.entry);
    return entries
      .map((entry) => atomEntryToParsed(entry, source))
      .filter((x): x is ParsedItem => x !== null);
  }

  return [];
}

function rssItemToParsed(
  item: Record<string, unknown>,
  source: NewsSource,
): ParsedItem | null {
  const title = asString(item.title);
  const link = asString(item.link);
  const description = asString(item.description) || asString(item['content:encoded']);
  const pubDate = asString(item.pubDate) || asString(item['dc:date']);
  if (!title || !link || !pubDate) return null;

  const iso = toIso(pubDate);
  if (!iso) return null;

  const cleaned = sourceSpecificClean(
    collapseWhitespace(stripHtml(description)),
    source.name,
  );

  return {
    source: source.name,
    sourceUrl: source.homepage,
    url: link.trim(),
    title: collapseWhitespace(stripHtml(title)),
    summary: clamp(cleaned, 320),
    publishedAt: iso,
    lang: source.lang,
  };
}

function atomEntryToParsed(
  entry: Record<string, unknown>,
  source: NewsSource,
): ParsedItem | null {
  const title = asString(entry.title);
  // Atom link 可能是 <link href="..."/> 或多个 link
  const link = extractAtomLink(entry.link);
  const summary =
    asString(entry.summary) ||
    asString(entry.content) ||
    asString((entry as Record<string, unknown>)['media:description']);
  const updated = asString(entry.updated) || asString(entry.published);
  if (!title || !link || !updated) return null;

  const iso = toIso(updated);
  if (!iso) return null;

  const cleaned = sourceSpecificClean(
    collapseWhitespace(stripHtml(summary)),
    source.name,
  );

  return {
    source: source.name,
    sourceUrl: source.homepage,
    url: link.trim(),
    title: collapseWhitespace(stripHtml(title)),
    summary: clamp(cleaned, 320),
    publishedAt: iso,
    lang: source.lang,
  };
}

// -------------------------------------------------------------
// 小工具
// -------------------------------------------------------------
function toArray<T = unknown>(v: unknown): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? (v as T[]) : [v as T];
}

function asString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  // fast-xml-parser 会把带属性的节点解析成 { '#text': '...', '@_attr': '...' }
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    if (typeof obj['#text'] === 'string') return obj['#text'];
  }
  return '';
}

function extractAtomLink(link: unknown): string {
  if (!link) return '';
  if (typeof link === 'string') return link;
  if (Array.isArray(link)) {
    // 优先 rel="alternate"
    const alt = link.find(
      (l) => typeof l === 'object' && l && (l as Record<string, unknown>)['@_rel'] === 'alternate',
    );
    const pick = (alt || link[0]) as Record<string, unknown> | undefined;
    return typeof pick?.['@_href'] === 'string' ? pick['@_href'] : '';
  }
  if (typeof link === 'object') {
    const obj = link as Record<string, unknown>;
    if (typeof obj['@_href'] === 'string') return obj['@_href'];
  }
  return '';
}

// 源特定的 summary 清洗 —— 处理 RSS description 里塞元数据而非真实摘要的情况
// 必须和 lib/news-sources.ts 的 name 字段保持一致,否则不会命中
function sourceSpecificClean(summary: string, source: string): string {
  if (source === 'arXiv cs.AI') {
    // 格式: "arXiv:XXXX.YYYYY Announce Type: new Abstract: <真实摘要>"
    const i = summary.indexOf('Abstract:');
    if (i >= 0) return summary.slice(i + 'Abstract:'.length).trim();
    return summary; // arXiv 格式偶有变体,fallback 原样
  }
  if (source === 'Hacker News (AI)') {
    // HN description 永远是 "Article URL: ... Comments URL: ... Points: ..."
    // 这是 HN 设计,没有真实摘要可拿。置空,UI 只显示标题。
    return '';
  }
  return summary;
}

function stripHtml(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function clamp(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

function toIso(raw: string): string | null {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
