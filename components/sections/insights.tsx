import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getInsights } from '@/lib/content';

function formatDate(iso: string, lang: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (lang === 'zh') {
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

export default async function Insights({ lang }: { lang: string }) {
  const items = getInsights(lang);
  const t = await getTranslations('sections');

  return (
    <section id="insights" className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="section-num">§ 01</span>
          <h2 className="section-title">{t('insights')}</h2>
          <span className="section-kicker">{t('insights_kicker')}</span>
        </div>
        <div className="insights-list">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={`/${lang}/insights/${item.slug}`}
              className="insight-row"
            >
              <span className="insight-date">{formatDate(item.date, lang)}</span>
              <span className="insight-tag">{item.tag}</span>
              <span className="insight-title">{item.title}</span>
              <span className="insight-arrow">→</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
