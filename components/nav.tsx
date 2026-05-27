import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function Nav({ lang }: { lang: string }) {
  const t = await getTranslations('nav');
  return (
    <nav className="site-nav">
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <Link href={`/${lang}`} className="wordmark">
          Carol<span style={{ color: 'var(--accent)' }}>.</span>
        </Link>
        <div className="nav-links">
          <Link href={`/${lang}/news`}>{t('news')}</Link>
          <a href="#insights">{t('insights')}</a>
          <Link href={`/${lang}/perspectives`}>{t('perspectives')}</Link>
          <a href="#plans">{t('plans')}</a>
          <a href="#about">{t('about')}</a>
        </div>
      </div>
    </nav>
  );
}
