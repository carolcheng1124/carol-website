import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import {
  getNote,
  getNotes,
  renderMarkdown,
  isPlaceholderBody,
  stripBracketMarkers,
} from '@/lib/content';

type Params = { lang: string; slug: string };

export function generateStaticParams() {
  // Pre-generate slugs for zh + en (other 6 locales reuse en content at runtime)
  const out: Params[] = [];
  for (const lang of ['zh', 'en'] as const) {
    for (const item of getNotes(lang)) {
      out.push({ lang, slug: item.slug });
    }
  }
  return out;
}

function formatDate(iso: string, lang: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (lang === 'zh') {
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

export default async function NotePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang, slug } = await params;

  if (!routing.locales.includes(lang as (typeof routing.locales)[number])) {
    notFound();
  }
  setRequestLocale(lang);

  const note = getNote(lang, slug);
  if (!note) notFound();

  const placeholder = isPlaceholderBody(note.body);
  const html = placeholder ? '' : renderMarkdown(stripBracketMarkers(note.body));

  // HANDOFF rule: for non-zh/en visitors essay content stays English with notice.
  const fallbackNotice =
    lang !== 'zh' && lang !== 'en' ? 'Article in English' : null;

  const backLabel = lang === 'zh' ? '返回首页' : 'Back to home';
  const pendingMsg =
    lang === 'zh'
      ? '正文待补 — Carol 正在写'
      : 'English version pending — Carol to hand-write (no AI translation)';

  return (
    <div className="container">
      <article className="article-page">
        <Link href={`/${lang}#notes`} className="article-back">
          ← {backLabel}
        </Link>

        <div className="article-meta">
          <span>{formatDate(note.date, lang)}</span>
          <span className="tag">{note.tag}</span>
          {fallbackNotice && <span>· {fallbackNotice}</span>}
        </div>

        <h1 className="article-title">{note.title}</h1>

        {placeholder ? (
          <p className="article-pending">{pendingMsg}</p>
        ) : (
          <div
            className="article-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </article>
    </div>
  );
}
