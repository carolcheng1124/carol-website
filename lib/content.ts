import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: false });

const CONTENT_ROOT = path.join(process.cwd(), 'content');

export type Lang = 'zh' | 'en';

export type InsightMeta = {
  slug: string;
  title: string;
  date: string; // ISO YYYY-MM-DD
  tag: string;  // Essay / Note / Review …
};

export type Insight = InsightMeta & {
  body: string;
};

export type Perspective = {
  slug: string;
  quote: string;
  author: string;
  citation: string;
  take: string; // body markdown (plain text for MVP)
  order: number;
};

export type Plan = {
  title: string;
  desc: string;
  status: 'active' | 'explore' | 'shipped';
  state: string;
};

export type Contact = {
  label: string;
  value: string;
  href: string;
};

export type About = {
  prose: string; // raw markdown body
  contacts: Contact[];
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function safeReadDir(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function readMarkdown(filePath: string) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return matter(raw);
}

// Resolve content for a given lang, falling back to the other lang if missing.
// HANDOFF: zh primary, en hand-written. For other 6 langs we fall back to en.
function resolveLang(lang: string): Lang {
  return lang === 'zh' ? 'zh' : 'en';
}

// ------------------------------------------------------------
// Insights
// ------------------------------------------------------------

export function getInsights(lang: string): InsightMeta[] {
  const dir = path.join(CONTENT_ROOT, resolveLang(lang), 'insights');
  const files = safeReadDir(dir).filter((f) => f.endsWith('.md'));

  const items: InsightMeta[] = files.map((file) => {
    const slug = file.replace(/\.md$/, '');
    const { data } = readMarkdown(path.join(dir, file));
    return {
      slug,
      title: String(data.title ?? slug),
      date: String(data.date ?? ''),
      tag: String(data.tag ?? 'Note'),
    };
  });

  // Latest first
  items.sort((a, b) => (a.date < b.date ? 1 : -1));
  return items;
}

export function getInsight(lang: string, slug: string): Insight | null {
  const dir = path.join(CONTENT_ROOT, resolveLang(lang), 'insights');
  const filePath = path.join(dir, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const { data, content } = readMarkdown(filePath);
  return {
    slug,
    title: String(data.title ?? slug),
    date: String(data.date ?? ''),
    tag: String(data.tag ?? 'Note'),
    body: content.trim(),
  };
}

// ------------------------------------------------------------
// Perspectives
// ------------------------------------------------------------

export function getPerspectives(lang: string): Perspective[] {
  const dir = path.join(CONTENT_ROOT, resolveLang(lang), 'perspectives');
  const files = safeReadDir(dir).filter((f) => f.endsWith('.md'));

  const items: Perspective[] = files.map((file) => {
    const slug = file.replace(/\.md$/, '');
    const { data, content } = readMarkdown(path.join(dir, file));
    return {
      slug,
      quote: String(data.quote ?? ''),
      author: String(data.author ?? ''),
      citation: String(data.citation ?? ''),
      take: content.trim(),
      order: Number(data.order ?? 99),
    };
  });

  items.sort((a, b) => a.order - b.order);
  return items;
}

// ------------------------------------------------------------
// Plans
// ------------------------------------------------------------

export function getPlans(lang: string): Plan[] {
  const filePath = path.join(CONTENT_ROOT, resolveLang(lang), 'plans.md');
  if (!fs.existsSync(filePath)) return [];
  const { data } = readMarkdown(filePath);
  const raw = Array.isArray(data.items) ? data.items : [];
  return raw.map((it: Record<string, unknown>) => ({
    title: String(it.title ?? ''),
    desc: String(it.desc ?? ''),
    status: (it.status as Plan['status']) ?? 'explore',
    state: String(it.state ?? ''),
  }));
}

// ------------------------------------------------------------
// About
// ------------------------------------------------------------

export function getAbout(lang: string): About {
  const filePath = path.join(CONTENT_ROOT, resolveLang(lang), 'about.md');
  if (!fs.existsSync(filePath)) {
    return { prose: '', contacts: [] };
  }
  const { data, content } = readMarkdown(filePath);
  const contacts: Contact[] = Array.isArray(data.contacts)
    ? data.contacts.map((c: Record<string, unknown>) => ({
        label: String(c.label ?? ''),
        value: String(c.value ?? ''),
        href: String(c.href ?? '#'),
      }))
    : [];
  return {
    prose: content.trim(),
    contacts,
  };
}

// ------------------------------------------------------------
// Tiny markdown → HTML for the about prose
// Only handles **bold** (rendered as italic Fraunces via .about-prose strong CSS)
// and paragraphs split by blank lines. Good enough for MVP about section.
// ------------------------------------------------------------

export function renderInlineMarkdown(text: string): string {
  // Escape minimal HTML
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // **bold** → <strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Accent dot marker: trailing `[.]` → red italic dot
  html = html.replace(/\[\.\]/g, '<span class="accent-dot">.</span>');
  return html;
}

export function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

// Full markdown → HTML for the article body. Server-only, sync render.
export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

// Heuristic: body has nothing but bracketed marker lines (e.g. "[English version pending …]").
// If real prose remains after stripping single-line `[…]` markers → not a placeholder.
export function isPlaceholderBody(md: string): boolean {
  const stripped = md
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^\[[^\]]*\]$/.test(l))
    .join('\n')
    .trim();
  return stripped.length === 0;
}

// Strip leading single-line bracketed markers like "[placeholder — Carol to write]"
// from the rendered body, while keeping the rest of the prose.
export function stripBracketMarkers(md: string): string {
  return md
    .split(/\r?\n/)
    .filter((l) => !/^\[[^\]]*\]$/.test(l.trim()))
    .join('\n')
    .replace(/^\s*\n+/, '');
}
