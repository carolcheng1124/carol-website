import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Node.js runtime — see /api/chat/route.ts for rationale.
export const runtime = 'nodejs';

// Returns the visitor's reader serial. The client component is responsible for
// caching the value in a cookie so repeat visits don't insert a new row.
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { serial: null, reason: 'supabase_unconfigured' },
      { status: 200 },
    );
  }

  let lang: string | null = null;
  try {
    const body = (await req.json()) as { lang?: unknown };
    if (typeof body.lang === 'string') lang = body.lang.slice(0, 8);
  } catch {
    // ignore — lang stays null
  }

  const ua = req.headers.get('user-agent')?.slice(0, 200) ?? null;

  // Service-role client bypasses RLS — never expose this key to the browser.
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('readers')
    .insert({ lang, user_agent: ua })
    .select('serial_id')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { serial: null, reason: 'insert_failed', detail: error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ serial: Number(data.serial_id) });
}
