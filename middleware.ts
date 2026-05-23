import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except API, auth callback, Next internals, and static files
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
};
