import { getTranslations } from 'next-intl/server';
import { getAbout, renderInlineMarkdown, splitParagraphs } from '@/lib/content';

export default async function About({ lang }: { lang: string }) {
  const about = getAbout(lang);
  const t = await getTranslations('sections');
  const sideLabel = lang === 'zh' ? '联系方式' : 'Contact';
  const paragraphs = splitParagraphs(about.prose);

  return (
    <section id="about" className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="section-num">§ 04</span>
          <h2 className="section-title">{t('about')}</h2>
          <span className="section-kicker">{t('about_kicker')}</span>
        </div>
        <div className="about-grid">
          <div className="about-prose">
            {paragraphs.map((p, i) => (
              <p
                key={i}
                dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(p) }}
              />
            ))}
          </div>
          <aside className="about-side">
            <div className="about-side-label">{sideLabel}</div>
            <ul className="contact-list">
              {about.contacts.map((c) => (
                <li key={c.label}>
                  <a
                    href={c.href}
                    target={c.href.startsWith('http') ? '_blank' : undefined}
                    rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    <span className="label">{c.label}</span>
                    <span className="value">{c.value}</span>
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}
