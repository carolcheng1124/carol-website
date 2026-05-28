import { getTranslations } from 'next-intl/server';
import { getPerspectives } from '@/lib/content';

export default async function Perspectives({ lang }: { lang: string }) {
  const items = getPerspectives(lang);
  const t = await getTranslations('sections');
  const takeLabel = lang === 'zh' ? '我的看法' : 'My take';

  return (
    <section id="perspectives" className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="section-num">§ 03</span>
          <h2 className="section-title">{t('perspectives')}</h2>
          <span className="section-kicker">{t('perspectives_kicker')}</span>
        </div>
        <div className="perspectives-grid">
          {items.map((p) => (
            <article key={p.slug} className="perspective-card">
              <span className="perspective-mark">&ldquo;</span>
              <blockquote className="perspective-quote">{p.quote}</blockquote>
              <div className="perspective-source">
                <span className="author-name">{p.author}</span>
                <span className="dot" />
                <span>{p.citation}</span>
              </div>
              {p.take && (
                <div className="perspective-take">
                  <span className="label">{takeLabel}</span>
                  {p.take}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
