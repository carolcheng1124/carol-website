import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { getPerspectives } from '@/lib/content';

export default async function PerspectivesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!routing.locales.includes(lang as (typeof routing.locales)[number])) {
    notFound();
  }
  setRequestLocale(lang);

  const items = getPerspectives(lang);
  const t = await getTranslations('sections');
  const takeLabel = lang === 'zh' ? '我的看法' : 'My take';
  const backLabel = lang === 'zh' ? '返回首页' : 'Back to home';

  return (
    <div className="container">
      <article className="article-page">
        <Link href={`/${lang}`} className="article-back">
          ← {backLabel}
        </Link>

        <div className="section-head" style={{ marginTop: 0 }}>
          <span className="section-num">§ 02</span>
          <h1 className="section-title">{t('perspectives')}</h1>
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
      </article>
    </div>
  );
}
