import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except API, auth callback, Next internals, and static files
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
  // next-intl's middleware transitively imports node:fs / node:path,
  // which Vercel's default Edge runtime forbids. Run on Node.js instead.
  runtime: 'nodejs',
};
