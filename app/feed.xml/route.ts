import { getNewsItems } from '@/lib/news';
import { getNotes } from '@/lib/content';

export const runtime = 'nodejs';
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shanshanbuchi.com';
const FEED_TITLE = 'Carol — The AI-Pilled Daily';
const FEED_DESC =
  "What's happening in AI today + field notes from an AI PM. 来源：OpenAI / Anthropic / DeepMind / arXiv / 月之暗面 等公开 RSS + Carol 手写笔记。";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc822(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

type FeedEntry = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
  category: 'News' | 'Notes';
  lang: 'zh' | 'en';
};

async function buildEntries(): Promise<FeedEntry[]> {
  const news = await getNewsItems();
  const newsEntries: FeedEntry[] = news.map((n) => ({
    title: n.title,
    link: n.url,
    description: n.summary,
    pubDate: n.publishedAt,
    guid: `news:${n.id}`,
    category: 'News',
    lang: n.lang,
  }));

  const noteEntries: FeedEntry[] = (['zh', 'en'] as const).flatMap((lang) =>
    getNotes(lang).map((n) => ({
      title: n.title,
      link: `${SITE_URL}/${lang}/notes/${n.slug}`,
      description: n.summary ?? '',
      pubDate: n.date,
      guid: `notes:${lang}:${n.slug}`,
      category: 'Notes' as const,
      lang,
    })),
  );

  return [...newsEntries, ...noteEntries].sort((a, b) =>
    a.pubDate < b.pubDate ? 1 : a.pubDate > b.pubDate ? -1 : 0,
  );
}

function renderItem(e: FeedEntry): string {
  return `    <item>
      <title>${escapeXml(e.title)}</title>
      <link>${escapeXml(e.link)}</link>
      <guid isPermaLink="false">${escapeXml(e.guid)}</guid>
      <pubDate>${toRfc822(e.pubDate)}</pubDate>
      <category>${e.category}</category>
      <dc:language>${e.lang}</dc:language>
      <description>${escapeXml(e.description)}</description>
    </item>`;
}

export async function GET() {
  const entries = await buildEntries();
  const latest = entries[0]?.pubDate ?? new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml(FEED_DESC)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${toRfc822(latest)}</lastBuildDate>
    <atom:link href="${escapeXml(`${SITE_URL}/feed.xml`)}" rel="self" type="application/rss+xml" />
${entries.map(renderItem).join('\n')}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
