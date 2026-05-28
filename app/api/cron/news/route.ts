import { createClient } from '@supabase/supabase-js';
import { NEWS_SOURCES } from '@/lib/news-sources';
import { fetchAndParseFeed, type ParsedItem } from '@/lib/rss';

// Node runtime: Supabase + fast-xml-parser 都依赖 Node 内置模块,
// 不能跑在 Edge runtime。和 /api/chat、/api/twin-take 保持一致。
export const runtime = 'nodejs';

// 单次 cron 总预算 —— 11 个源 × 单源 15s 超时,留一倍 buffer
export const maxDuration = 60;

// =============================================================
// GET /api/cron/news
//
// Vercel Cron 触发(见 vercel.json),用 CRON_SECRET 校验。
// 流程: 并发抓 11 个 RSS 源 → upsert 到 news_items(url unique)
// → 失败的源单独记录,不影响其他源。
// AI 解读(twin-take)按懒加载方案处理,这里不调。
// =============================================================

type Result = {
  source: string;
  fetched: number;     // 解析出来多少条
  inserted: number;    // 真正新增多少条
  error?: string;
};

export async function GET(req: Request) {
  // ---- 1. 认证 ----
  // Vercel Cron 会自动带 Authorization: Bearer $CRON_SECRET
  // 本地手动测试时也用同一个 header
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return Response.json(
      { ok: false, error: 'CRON_SECRET not configured' },
      { status: 500 },
    );
  }
  if (auth !== `Bearer ${expected}`) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // ---- 2. Supabase service-role client(bypass RLS) ----
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return Response.json(
      { ok: false, error: 'Supabase env missing' },
      { status: 500 },
    );
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ---- 3. 并发抓所有源,失败的源单独记录 ----
  const startedAt = Date.now();
  const settled = await Promise.allSettled(
    NEWS_SOURCES.map((source) => fetchAndParseFeed(source)),
  );

  const results: Result[] = [];
  const allItems: ParsedItem[] = [];

  settled.forEach((s, i) => {
    const source = NEWS_SOURCES[i];
    if (s.status === 'rejected') {
      results.push({
        source: source.name,
        fetched: 0,
        inserted: 0,
        error: s.reason instanceof Error ? s.reason.message : String(s.reason),
      });
      return;
    }
    const items = s.value;
    allItems.push(...items);
    results.push({ source: source.name, fetched: items.length, inserted: 0 });
  });

  // ---- 4. upsert 到 DB(url 是 unique 约束,onConflict do nothing) ----
  // 一次 upsert 全部,supabase-js 内部会拆批
  let totalInserted = 0;
  if (allItems.length > 0) {
    const rows = allItems.map((x) => ({
      source: x.source,
      source_url: x.sourceUrl,
      url: x.url,
      title: x.title,
      summary: x.summary,
      published_at: x.publishedAt,
      lang: x.lang,
    }));

    // ignoreDuplicates: true 让冲突的行不报错也不更新,纯增量
    const { data, error } = await supabase
      .from('news_items')
      .upsert(rows, { onConflict: 'url', ignoreDuplicates: true })
      .select('source');

    if (error) {
      return Response.json(
        {
          ok: false,
          error: `db upsert failed: ${error.message}`,
          fetched: allItems.length,
          results,
        },
        { status: 500 },
      );
    }

    // data 是真正被插入的行(ignoreDuplicates 模式下),回填到 results
    totalInserted = data?.length ?? 0;
    const insertedBySource = new Map<string, number>();
    (data ?? []).forEach((row) => {
      insertedBySource.set(row.source, (insertedBySource.get(row.source) ?? 0) + 1);
    });
    results.forEach((r) => {
      r.inserted = insertedBySource.get(r.source) ?? 0;
    });
  }

  return Response.json({
    ok: true,
    durationMs: Date.now() - startedAt,
    sources: NEWS_SOURCES.length,
    fetched: allItems.length,
    inserted: totalInserted,
    results,
  });
}
