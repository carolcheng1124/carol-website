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
          <a href="#insights">{t('insights')}</a>
          <a href="#perspectives">{t('perspectives')}</a>
          <a href="#plans">{t('plans')}</a>
          <a href="#about">{t('about')}</a>
        </div>
      </div>
    </nav>
  );
}
