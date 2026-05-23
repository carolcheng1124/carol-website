import { getTranslations } from 'next-intl/server';

export default async function Footer() {
  const t = await getTranslations('footer');
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-inner">
          <div className="footer-mark">
            Carol<span style={{ color: 'var(--accent)' }}>.</span>
          </div>
          <div className="footer-meta">
            {t('edition')} · {year} · <span className="accent">{t('builtWith')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
