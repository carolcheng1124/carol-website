import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

// Deep merge: target wins where defined, otherwise fallback fills in.
// Keeps 6-language UI usable without re-translating every new string —
// missing keys silently fall through to English.
function deepMerge<T extends Record<string, unknown>>(fallback: T, target: T): T {
  const out: Record<string, unknown> = { ...fallback };
  for (const [k, v] of Object.entries(target)) {
    const existing = out[k];
    if (
      v && typeof v === 'object' && !Array.isArray(v) &&
      existing && typeof existing === 'object' && !Array.isArray(existing)
    ) {
      out[k] = deepMerge(existing as Record<string, unknown>, v as Record<string, unknown>);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const enMessages = (await import('../messages/en.json')).default;
  const localeMessages =
    locale === 'en'
      ? enMessages
      : (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages: deepMerge(enMessages, localeMessages),
  };
});
