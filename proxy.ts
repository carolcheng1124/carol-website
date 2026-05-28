import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

// /insights → /notes is the v2 rename. Use 308 (permanent + preserves method)
// so external links stay valid. The pattern matches /<locale>/insights and any sub-path.
const INSIGHTS_REDIRECT = /^\/([a-z]{2})\/insights(\/.*)?$/;

export default function proxy(req: NextRequest) {
  const match = req.nextUrl.pathname.match(INSIGHTS_REDIRECT);
  if (match) {
    const url = req.nextUrl.clone();
    url.pathname = `/${match[1]}/notes${match[2] ?? ''}`;
    return NextResponse.redirect(url, 308);
  }
  return intlMiddleware(req);
}

export const config = {
  // Match all pathnames except API, auth callback, Next internals, and static files
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
};
