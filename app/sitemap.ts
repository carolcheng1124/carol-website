import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getInsights } from '@/lib/content';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shanshanbuchi.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const lang of routing.locales) {
    entries.push({
      url: `${SITE_URL}/${lang}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: lang === routing.defaultLocale ? 1.0 : 0.8,
    });
    entries.push({
      url: `${SITE_URL}/${lang}/news`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    });
    entries.push({
      url: `${SITE_URL}/${lang}/perspectives`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  }

  // Insight detail pages — only zh + en (other 6 locales reuse en content)
  for (const lang of ['zh', 'en'] as const) {
    for (const item of getInsights(lang)) {
      const lastMod = item.date ? new Date(item.date) : now;
      entries.push({
        url: `${SITE_URL}/${lang}/insights/${item.slug}`,
        lastModified: Number.isNaN(lastMod.getTime()) ? now : lastMod,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }
  }

  return entries;
}
