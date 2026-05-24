# CLAUDE.md — Project rules for Carol's Website

This file is auto-loaded by Claude Code in every session. Read `HANDOFF.md` once for full context, then return to this file for rules of thumb.

---

## Visual rules — non-negotiable

- **Light theme only**. No dark mode in MVP.
- Base background is `#FAF8F3` (米白). Never use pure white `#FFFFFF`.
- Text is `#1A1A1A`. Never use pure black `#000000`.
- The single accent color is `#C8553D` (锡红). Do not introduce additional colors.
- **Chinese characters NEVER get `font-style: italic`** — it renders as synthetic oblique and looks wrong. Use Noto Serif SC `font-style: normal`.
- English/Latin display text uses Fraunces italic.
- Body text: Inter for English, PingFang SC for Chinese (system fallback).
- All hover transitions use easing `cubic-bezier(0.22, 1, 0.36, 1)` — defined as `--easing`.
- Hover transitions: 0.4-0.6s. Avoid bouncy/spring easings.

## Interaction rules

- **Hover-breathing is the only signature interaction**. Do not invent additional signatures.
  - translateY(-2px to -4px) + border to ink + background to bg-warm + accent line growing + arrow/affordance fading in
- All transitions feel restrained. Editorial style = no flashy effects.
- Scroll behavior: smooth, with a 2px accent scroll progress bar at top.

## Tech rules

- Next.js App Router (not Pages Router).
- Use Tailwind for layout. Use CSS variables for theme tokens (defined in `globals.css`).
- Use shadcn/ui sparingly — always restyle to match editorial system.
- **Do not use shadcn `Dialog` for the AskPanel**. Build it custom (see `hero-mockup.html` for exact CSS/HTML pattern).
- `/api/chat` and `/api/welcome` run on Node.js runtime (`export const runtime = 'nodejs'`). The Anthropic SDK and `@supabase/supabase-js` both use `node:crypto` internally, which Vercel's Edge runtime rejects. Node runtime in Next 16 streams responses natively — no streaming penalty.
- Use `next-intl`, not `next-i18next`.
- Use `@supabase/ssr` for server-side Supabase (not the deprecated auth-helpers).

## Content rules

- Markdown files in `/content/` are the source of truth — no headless CMS.
- Chinese content is primary; English is hand-written by Carol, never AI-translated.
- Other 6 languages: UI strings only. Essay content stays English for non-zh/en visitors, with top-of-article notice `Article in English`.
- Slug-based routing: filenames become slugs.

## Backend rules

- Supabase `serial_id` uses `generated always as identity` — never `count(*)` or any logic that races.
- Quota check order in `/api/chat`: monthly free quota → paid credits → 402 with checkout URL.
- Stripe: one-time products only, never subscriptions in MVP.
- Magic Link auth only. No password forms.

## Anti-pattern checklist (review before any PR)

- [ ] No `localStorage` or `sessionStorage` (Supabase manages auth state)
- [ ] No subscription billing logic
- [ ] No conversation history persistence in DB
- [ ] No vector embeddings / RAG (system prompt approach is the MVP)
- [ ] No additional animation styles beyond hover-breathing
- [ ] No `font-style: italic` on Chinese characters
- [ ] No pure `#000` or pure `#FFF`
- [ ] No `Dialog` / `Modal` / `Drawer` from shadcn for the AskPanel
- [ ] No second accent color introduced
- [ ] No headers other than `§ NN` editorial style

## When in doubt

- Visual question → consult `hero-mockup.html` first
- Architecture question → consult `HANDOFF.md` §5
- Decision missing → check `HANDOFF.md` §8 (Pending decisions), ask Carol

## Pending decisions to ask Carol

These were left open during design. Ask one at a time when you reach the relevant work:

1. Hero English version (3 options in HANDOFF §8)
2. Floating link wording: English `Ask Carol →` or Chinese `跟我聊聊 →`
3. Topic chip `Q.` marker: keep or remove
4. Ask panel width: 460px or 520px
5. Footer "Powered by Claude": keep or remove
6. Exact domain
7. Hero translations for other 6 languages
8. Stripe price confirmation
