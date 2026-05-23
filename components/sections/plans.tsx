import { getTranslations } from 'next-intl/server';
import { getPlans } from '@/lib/content';

export default async function Plans({ lang }: { lang: string }) {
  const items = getPlans(lang);
  const t = await getTranslations('sections');

  return (
    <section id="plans" className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="section-num">§ 03</span>
          <h2 className="section-title">{t('plans')}</h2>
          <span className="section-kicker">{t('plans_kicker')}</span>
        </div>
        <div className="plans-list">
          {items.map((p, i) => (
            <div key={`${p.title}-${i}`} className="plan-row">
              <span className={`plan-status-dot ${p.status}`} aria-hidden />
              <div>
                <h3 className="plan-title">{p.title}</h3>
                <p className="plan-desc">{p.desc}</p>
              </div>
              <div className="plan-state">
                <span className={`state-tag ${p.status === 'active' ? 'active' : ''}`}>
                  {p.state}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
