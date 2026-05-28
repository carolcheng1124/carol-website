import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
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

export default async function NewsPreview({ lang }: { lang: string }) {
  const t = await getTranslations('news');
  const items = getNewsItems().slice(0, 10);
  const moreLabel = lang === 'zh' ? '看全部 News' : 'See all News';

  return (
    <section id="news" className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="section-num">§ 01</span>
          <h2 className="section-title">{t('title')}</h2>
          <span className="section-kicker">{t('kicker')}</span>
        </div>

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
              </div>
              <span className="news-arrow">↗</span>
            </a>
          ))}
        </div>

        <div style={{ marginTop: 32, textAlign: 'right' }}>
          <Link href={`/${lang}/news`} className="text-link">
            {moreLabel} <span className="arrow">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
