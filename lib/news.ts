import { createClient } from '@supabase/supabase-js';

// =============================================================
// /news 数据源 —— 直读 Supabase news_items 表
//
// 表数据由 Vercel Cron (app/api/cron/news/route.ts) 写入。
// news_items 启用 RLS 且无 policy,所以这里必须用 service_role key
// (server-only, schema.sql 有约定: 前端永远不直连这张表)。
// 调用方都是 RSC,在 Node runtime 跑,key 不会泄到浏览器。
// =============================================================

export type NewsItem = {
  id: string;
  source: string;
  sourceUrl: string;
  title: string;
  url: string;
  summary: string;
  publishedAt: string; // ISO 8601
  lang: 'zh' | 'en';
  aiTake?: string;
};

type Row = {
  id: string;
  source: string;
  source_url: string;
  url: string;
  title: string;
  summary: string;
  published_at: string;
  lang: 'zh' | 'en';
  ai_take: string | null;
};

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase env missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function rowToItem(r: Row): NewsItem {
  return {
    id: r.id,
    source: r.source,
    sourceUrl: r.source_url,
    title: r.title,
    url: r.url,
    summary: r.summary,
    publishedAt: r.published_at,
    lang: r.lang,
    aiTake: r.ai_take ?? undefined,
  };
}

const SELECT = 'id, source, source_url, url, title, summary, published_at, lang, ai_take';

export async function getNewsItems(limit = 50): Promise<NewsItem[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('news_items')
    .select(SELECT)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) {
    // 不抛 —— 让 /news 页面渲染空列表,不要把整个站炸了
    console.error('[getNewsItems]', error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToItem(r as Row));
}

export async function getNewsItem(id: string): Promise<NewsItem | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('news_items')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToItem(data as Row);
}
