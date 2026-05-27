import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { getNewsItems } from '@/lib/news';

function formatDate(iso: string, lang: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (lang === 'zh') {
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

export function generateStaticParams() {
  return routing.locales.map((lang) => ({ lang }));
}

export default async function NewsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) {
    notFound();
  }
  setRequestLocale(lang);

  const t = await getTranslations('news');
  const items = getNewsItems();

  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="section-num">§ 01</span>
          <h2 className="section-title">{t('title')}</h2>
          <span className="section-kicker">{t('kicker')}</span>
        </div>

        <p className="news-intro">{t('intro')}</p>

        <div className="news-list">
          {items.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="news-row"
            >
              <span className="news-date">{formatDate(item.publishedAt, lang)}</span>
              <span className="news-source">{item.source}</span>
              <div className="news-title-col">
                <span className="news-title">{item.title}</span>
                <span className="news-summary">{item.summary}</span>
                {item.aiTake && (
                  <div className="ai-take">
                    <span className="ai-take-label">🤖 {t('aiTakeLabel')}</span>
                    <p className="ai-take-body">{item.aiTake}</p>
                  </div>
                )}
              </div>
              <span className="news-arrow">↗</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
