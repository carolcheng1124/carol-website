import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getInsights } from '@/lib/content';

// CSS adds the red "." via .hero-headline .line-2::after, so we strip any
// trailing period/句号 from the message to avoid doubling.
function stripTrailingPeriod(s: string) {
  return s.replace(/[。\.]+\s*$/u, '');
}

export default async function Hero({ lang }: { lang: string }) {
  const t = await getTranslations('hero');
  const latest = getInsights(lang)[0];
  const readHref = latest ? `/${lang}/insights/${latest.slug}` : '#insights';
  return (
    <section className="hero">
      <div className="container" style={{ width: '100%' }}>
        <p className="hero-eyebrow">{t('eyebrow')}</p>
        <h1 className="hero-headline">
          <span className="line-1">{t('headline_line1')}</span>
          <span className="line-2">{stripTrailingPeriod(t('headline_line2'))}</span>
        </h1>
        <div className="hero-byline">
          <span className="name">Carol</span>
          <span className="sep">·</span>
          <span>{t('byline')}</span>
        </div>
        <div className="hero-ctas" style={{ marginTop: 64, display: 'flex', gap: 40 }}>
          <Link href={readHref} className="text-link">
            {t('cta_read')} <span className="arrow">→</span>
          </Link>
          <a href="#ask" className="text-link">
            {t('cta_chat')} <span className="arrow">→</span>
          </a>
        </div>
        <div className="edition-marker">EDITION · 01 · {new Date().getFullYear()}</div>
      </div>
    </section>
  );
}
