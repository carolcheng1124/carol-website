import { NextResponse } from 'next/server';
import { createSupabaseServerClient, hasSupabaseEnv } from '@/lib/supabase/server';

// Magic Link callback. Supabase redirects here with ?code=...&next=/zh/some-path
// We exchange the code for a session cookie, then redirect to `next` (or /).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  if (!hasSupabaseEnv()) {
    return NextResponse.redirect(new URL('/?auth=unconfigured', url.origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?auth=missing_code', url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/?auth=error&msg=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  // Only allow same-origin relative redirects, never absolute URLs.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
