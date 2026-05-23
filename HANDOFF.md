# HANDOFF.md — Carol's Website

> Read this file end-to-end before writing any code. It captures every decision made during the design phase (in a separate Cowork session). Use it as the single source of truth.
> 
> Visual reference: `hero-mockup.html` in this directory. Open it in any browser to see the full design — all CSS/JS inline.

---

## 1. Project intent

A personal site for **Carol** — an AI product person and content curator. The site functions as an editorial "quarterly" publication around AI insights, curated KOL perspectives, current projects, and a built-in AI agent ("digital twin") that answers visitor questions in Carol's voice.

**Goal**: Ship MVP in 2 days. The whole project is itself a Claude Code practice run — going from idea to a deployed product end-to-end.

**Brand positioning**: Editorial / literary quarterly. Calm, considered, curated. Reference points: Stripe Press, Paul Graham essays, The Browser, Anthropic site. **Not**: SaaS dashboard, tech blog, generic personal portfolio.

**Locked taglines**
- Chinese hero: `在被加速的世界里,做一份慢下来的观察。`
- English eyebrow: `A Slower Pulse`
- Byline: `Carol · AI 产品人 · 内容策展者`

---

## 2. Tech stack (locked — do not relitigate)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Mature, Vercel-native, Edge runtime for streaming |
| Styling | Tailwind + custom CSS variables | Tailwind for layout, CSS vars for theme tokens |
| UI primitives | shadcn/ui (sparingly, restyled) | Use only where helpful; never default styles |
| Animation | Framer Motion + pure CSS hover | CSS handles hover-breathing; Framer for entrance/page transitions |
| Hosting | Vercel | Domain ready |
| Auth | Supabase Auth — Magic Link only | No passwords; cleanest editorial UX |
| DB | Supabase Postgres | `profiles` table with serial_id IDENTITY column |
| Payment | Stripe Hosted Checkout | One-time SKU only (not subscription) |
| AI | Anthropic Claude API | Edge runtime streaming |
| Content | Markdown in `/content/`, parsed with gray-matter | Git is the CMS |
| i18n | next-intl + middleware | Sub-path routing `/zh /en /ja …` |
| Anti-abuse | Cloudflare Turnstile | On `/api/chat` for free-quota requests |

**Do NOT bring in**: headless CMS, vector DB / RAG, Material UI / Chakra / etc, subscription billing, conversation history persistence, dark mode.

---

## 3. Visual system

### 3.1 Colors

```css
--bg: #FAF8F3;             /* 米白底 paper */
--bg-warm: #F4F0E6;        /* hover / section bg */
--bg-warmer: #EEE7D5;
--ink: #1A1A1A;            /* 深墨主文字 */
--ink-2: #4A4845;          /* 二级文字 */
--ink-3: #8A857C;          /* 标签 / 小注 */
--rule: #E5DFD0;           /* 分割线 */
--rule-2: #D5CFC0;
--accent: #C8553D;         /* 锡红 — 唯一彩色,慎用 */
--accent-soft: rgba(200, 85, 61, 0.08);
--easing: cubic-bezier(0.22, 1, 0.36, 1);
```

**Rule**: `--accent` is the only color besides ink scale. Never introduce another color.

### 3.2 Typography

| Font | Use | Style |
|---|---|---|
| Fraunces | English display, accents, section titles, CTAs, decorative labels | **italic** weight 400 |
| Noto Serif SC | Chinese display (headlines, essay titles, prose) | **normal** weight 500 |
| Inter + PingFang SC | All body text, UI labels, dates, numbers, mixed CJK UI strings | normal |

Standard font-family stack for headings:
```css
font-family: 'Fraunces', 'Noto Serif SC', 'Songti SC', serif;
font-style: normal;
```
Latin chars use Fraunces; CJK chars fall back to Noto Serif SC. **Never `font-style: italic` on Chinese** — it renders as synthetic oblique and looks wrong.

Load via `next/font/google` for Fraunces, Noto Serif SC, Inter.

### 3.3 Spacing & rhythm

- Container max-width: `1180px`, horizontal padding `48px` (desktop) / `24px` (mobile)
- Section padding: `140px` top/bottom (desktop)
- Section head with `border-bottom: 1px solid var(--rule-2)` separator
- Section labelled `§ 01 / 02 / 03 / 04` (Fraunces italic small)
- Background paper texture: radial-gradient subtle dots, 24x24 tile, opacity ~0.018

### 3.4 Signature interaction: **Hover breathing**

The only interaction language. Applies to anything hoverable (insight row, perspective card, contact link, topic chip, ask link).

Recipe:
1. `translateY(-2px → -4px)` on hover
2. border becomes `--ink`
3. background tints to `--bg-warm`
4. an accent line (1-2px, `--ink` or `--accent`) grows from left or top
5. an arrow / affordance fades or slides in
6. transition: `0.4-0.6s var(--easing)`

`--easing` is `cubic-bezier(0.22, 1, 0.36, 1)` — soft entry, brisk exit. Use everywhere; never spring/bounce easings.

---

## 4. Information architecture

### 4.1 Home page (single continuous scroll, one-page memo style)

| Section | Content | Layout |
|---|---|---|
| **Hero** | Eyebrow / 2-line Italic Chinese headline (with red period at end) / byline / 2 CTAs / vertical edition marker on right | Full viewport (min-height: 100vh - nav) |
| **§ 01 Insights** | 6 essays, latest first | Date \| Tag \| Title \| Arrow rows (notebook-style) |
| **§ 02 Perspectives** | 2-3 curated quotes from KOLs + Carol's take | Large pull-quote cards, 2-column grid |
| **§ 03 Plans** | 3-5 projects | Status dot \| Title + desc \| State pill |
| **§ 04 About** | Personal prose (3 paragraphs) + contact list | 2-column grid |
| **Footer** | Wordmark + edition info + "Built with Claude Code" | Single row |

### 4.2 Chat (no separate page)

- **Trigger**: floating `Ask Carol →` link, bottom-right, Fraunces italic with pulsing red dot
- **Also triggered by**: nav "Chat" link, hero "Talk to my digital twin" CTA
- **Panel**: 460px wide, slides in from right, full height
- **Panel structure**:
  - Header: `Ask Carol` title + subtitle + close button
  - Body: "Try asking" label + 4 topic chips + chat history area
  - Input: textarea + send button
  - Footer: quota indicator + "Powered by Claude"
- **Close**: backdrop click, close button (×), or Esc key
- **State**: `body.chat-open` class toggles panel + fades floating link + activates backdrop

### 4.3 Routes

```
/                                  → middleware detects browser lang, redirects
/[lang]                            → home page
/[lang]/insights/[slug]            → individual essay
/[lang]/perspectives/[slug]        → optional, can defer to Phase 2
/api/chat                          → streaming Anthropic (Edge runtime)
/api/stripe/webhook                → Stripe checkout completion
```

**Languages supported**: `zh, en, ja, ko, fr, de, es, pt`. Default detected from `Accept-Language` header, fallback `en`. Cookie remembers user's manual switch.

**Content language strategy at MVP**:
- UI strings: all 8 languages (use Claude to generate initial JSON, Carol verifies zh/en/ja)
- Essay content: zh and en only
- ja/ko/fr/de/es/pt visitors: UI in their language, essays shown in English with top notice: `Article in English`
- Phase 2: opt-in AI translation per essay with explicit "AI translated" marker

---

## 5. Backend architecture

### 5.1 Supabase schema

```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  serial_id int generated always as identity,        -- 第 N 位读者
  email text,
  preferred_lang text default 'en',
  monthly_quota_used int default 0,
  quota_reset_at timestamptz default now(),
  credits_remaining int default 0,
  created_at timestamptz default now()
);

-- Trigger: when auth.users gets a row, insert into profiles
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

**Important**: use `generated always as identity` for serial_id — never `count(*)` (race condition).

### 5.2 Auth

Supabase Auth, Magic Link only. Replace default email template (the stock one is ugly). On first sign-in, the trigger above creates the profile row.

After login, display top banner: `欢迎,你是第 042 位读者` (zero-padded to 3 digits — feels intentional, not auto-generated).

### 5.3 Agent endpoint

Route: `app/api/chat/route.ts`
Runtime: `export const runtime = 'edge'` for streaming

Approach:
1. Read all `*.md` files in `/content/` at build time (use `fs.readdirSync` in a server module, cache the concatenated string)
2. Build system prompt: Carol persona description + concatenated content + answering style guidelines
3. Stream Claude response back to client via SSE / ReadableStream

**Persona rules for the agent**:
- First person as Carol
- Mirrors Carol's tone: considered, concise, willing to disagree
- Cites essay slugs when referencing a piece
- Refuses topics not in the corpus rather than making things up
- Replies in the same language as the user's question

**Quota enforcement** (server-side):
```
if (!user)              → only allow if question matches a preset topic chip
if (monthly_quota_used < 5)  → allow, increment
else if (credits_remaining > 0)  → allow, decrement credits
else                    → return 402 with stripe checkout URL
```

### 5.4 Payment

- Stripe Hosted Checkout (no custom payment UI)
- One product: `Topic credits — 20 questions` at $1.99 / ¥9.9
- Webhook handler at `/api/stripe/webhook`:
  - Verify signature
  - On `checkout.session.completed`: add 20 to `credits_remaining` for the user_id passed in metadata
- Local dev: use `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### 5.5 Anti-abuse

- Cloudflare Turnstile on chat input for authenticated users (server-side verify)
- Hard per-IP daily limit: 50 chat requests/day (use Upstash Redis or Vercel KV)

---

## 6. Component patterns (extracted from `hero-mockup.html`)

### Section pattern
```tsx
<section className="page-section" id={id}>
  <div className="section-head">
    <span className="section-num">§ {number}</span>
    <h2 className="section-title">{title}</h2>
    <span className="section-kicker">{subtitle}</span>
  </div>
  {/* content */}
</section>
```

### Insight row
```tsx
<Link href={href} className="insight-row">
  <span className="insight-date">{formatDate(date)}</span>
  <span className="insight-tag">{tag}</span>
  <span className="insight-title">{title}</span>
  <span className="insight-arrow">→</span>
</Link>
```

### Perspective card
```tsx
<article className="perspective-card">
  <span className="perspective-mark">"</span>
  <p className="perspective-quote">{quote}</p>
  <div className="perspective-source">
    <span className="author-name">{author}</span>
    <span className="dot" />
    <span>{citation}</span>
  </div>
  <div className="perspective-take">
    <span className="label">Carol —</span>
    {take}
  </div>
</article>
```

### Plan row
```tsx
<div className="plan-row">
  <span className={`plan-status-dot ${status}`} />
  <div className="plan-body">
    <div className="plan-title">{title}</div>
    <p className="plan-desc">{desc}</p>
  </div>
  <div className="plan-state">
    <span className={`state-tag ${status === 'active' ? 'active' : ''}`}>{stateLabel}</span>
  </div>
</div>
```

Status enum: `active | explore | shipped`.

### Ask panel + floating link
See `hero-mockup.html` lines for `.ask-link`, `.ask-panel`, `.topic-chips` — port directly into a single React client component (`<AskPanel />`) and mount in root layout. **Do not use shadcn Dialog** — its default behavior doesn't match the editorial slide-in language.

---

## 7. Day-by-day plan

### Day 1 — Foundation + Content + Deploy

**Morning (3-4h)**
1. `npx create-next-app@latest carol-website --typescript --tailwind --app`
2. Install: `framer-motion`, `next-intl`, `gray-matter`, `@supabase/supabase-js`, `@supabase/ssr`, shadcn-ui init
3. Configure `next/font` for Fraunces / Noto Serif SC / Inter
4. Set up Supabase project + run schema migration
5. Connect repo to Vercel + bind custom domain
6. Set up `middleware.ts` with next-intl for 8 languages
7. Create `app/globals.css` with all CSS variables from §3.1

**Afternoon (4h)**
1. Build `<Nav />` and `<Footer />` shared components
2. Build `<Hero />`, `<Insights />`, `<Perspectives />`, `<Plans />`, `<About />` section components
3. Convert mockup CSS to Tailwind (use `@apply` in globals.css where Tailwind utility classes would get verbose)
4. Set up `/content/` markdown loading (gray-matter + node fs)
5. Render real content into sections

**Evening (2-3h)**
1. Write/import 5+ pieces of real content (at minimum: 3 insights, 1 perspective, plans, about)
2. Test all pages locally
3. Deploy to Vercel
4. Verify everything on `https://[domain]` — fonts load, no FOUC, dark text on light bg renders crisp

### Day 2 — Auth + Agent + Paywall + i18n

**Morning (3-4h)**
1. Supabase Magic Link sign-in (server actions)
2. Custom email template
3. Profile creation trigger + serial_id assignment
4. `<WelcomeBanner />` showing `欢迎,你是第 0XX 位读者` after login

**Afternoon (4-5h)**
1. `<AskPanel />` client component (port from mockup, add state)
2. `/api/chat` Edge route with Anthropic streaming
3. Wire panel input to API, render streamed response
4. Quota tracking server-side (read from profiles, increment on each query)
5. Stripe Checkout integration: when quota exhausted, show CTA to Checkout URL
6. `/api/stripe/webhook` to top up credits

**Evening (2-3h)**
1. Cloudflare Turnstile on chat input
2. Generate 8-language UI strings (Claude drafts, Carol verifies zh/en/ja)
3. Apply i18n strings throughout components
4. Full smoke test (auth flow / chat flow / purchase flow / language switch)
5. Ship 🚀

---

## 8. Pending decisions (resolve while building)

Ask Carol when you reach these — they were left open during design:

1. **Hero English version** — pick one:
   - A. `In an accelerating world — a slower pulse.`
   - B. `A slower way to watch a faster world.`
   - C. `Notes from a slower observer, in a faster age.`

2. **Floating link wording** — English `Ask Carol →` vs Chinese `跟我聊聊 →`

3. **Topic chip `Q.` marker** — keep red italic `Q.` prefix or remove (cleaner)

4. **Ask panel width** — 460px (current) vs 520px (more breathing room)

5. **Footer "Powered by Claude"** — keep as transparency or remove

6. **Exact domain** — confirm before deploy

7. **Hero translations for other 6 languages** (after Hero EN is locked)

8. **Stripe price** — confirm ¥9.9 / $1.99 / 20 questions

---

## 9. Out of scope (Phase 2)

- RAG / vector embeddings
- Conversation history persistence in DB
- Backend CMS
- Subscription billing
- AI translation for fr/de/es/pt content
- ja/ko content translation (UI only at MVP)
- Dark mode
- Multiple signature interactions
- Comments / reactions on essays
- Newsletter subscription form (link out to existing Substack instead)
- Search functionality

---

## 10. File structure (recommended)

```
carol-website/
├── app/
│   ├── [lang]/
│   │   ├── layout.tsx                // includes <AskPanel />
│   │   ├── page.tsx                  // home: hero + 4 sections
│   │   ├── insights/[slug]/page.tsx
│   │   └── perspectives/[slug]/page.tsx  // optional MVP
│   ├── api/
│   │   ├── chat/route.ts             // edge runtime, streaming
│   │   └── stripe/webhook/route.ts
│   └── globals.css                   // CSS vars + base typography
├── components/
│   ├── nav.tsx
│   ├── footer.tsx
│   ├── ask-panel.tsx                 // floating link + sliding panel
│   ├── welcome-banner.tsx
│   ├── language-switcher.tsx
│   └── sections/
│       ├── hero.tsx
│       ├── insights.tsx
│       ├── perspectives.tsx
│       ├── plans.tsx
│       └── about.tsx
├── content/
│   ├── zh/
│   │   ├── insights/*.md
│   │   ├── perspectives/*.md
│   │   ├── plans.md
│   │   └── about.md
│   └── en/
│       └── ...
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── anthropic.ts                  // agent prompt builder
│   ├── stripe.ts
│   └── content.ts                    // markdown loaders
├── messages/                          // next-intl
│   ├── zh.json
│   ├── en.json
│   ├── ja.json
│   ├── ko.json
│   ├── fr.json
│   ├── de.json
│   ├── es.json
│   └── pt.json
├── middleware.ts                     // next-intl lang detection + redirect
├── i18n.ts                           // next-intl config
├── HANDOFF.md                        // this file
├── CLAUDE.md                         // constraints (auto-loaded)
└── hero-mockup.html                  // visual reference
```

---

## 11. Getting started

```bash
mkdir carol-website && cd carol-website
# Place HANDOFF.md, CLAUDE.md, and hero-mockup.html into the directory
# Then start Claude Code:
claude

# First instruction to Claude Code:
> Read HANDOFF.md and CLAUDE.md, then begin Day 1 morning tasks from §7.
> Ask me only the pending decisions in §8 as you reach them.
```
