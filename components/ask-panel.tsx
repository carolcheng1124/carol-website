'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';

// text is always present; imageUrl is set on assistant messages from /api/draw.
// On those, `text` carries the prompt and is shown as caption.
type Msg = { role: 'user' | 'assistant'; text: string; imageUrl?: string };

// Slash command for image generation. Matches:
//   /画 一只穿西装的猫
//   /draw a cat in a suit
//   /image something
const DRAW_RE = /^\/(?:画|draw|image)\s+(.+)$/i;

const FREE_QUOTA = 5;
// sessionStorage so chat history + quota survive page refresh but not a
// fresh tab. Per-locale key so switching language gives a clean panel.
const STORAGE_KEY = (lang: string) => `askpanel:${lang}`;
const MAX_PERSISTED_MSGS = 40;

type Persisted = { messages: Msg[]; used: number };

function loadPersisted(lang: string): Persisted | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY(lang));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (!Array.isArray(parsed.messages) || typeof parsed.used !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePersisted(lang: string, data: Persisted) {
  if (typeof window === 'undefined') return;
  try {
    const trimmed: Persisted = {
      messages: data.messages.slice(-MAX_PERSISTED_MSGS),
      used: data.used,
    };
    sessionStorage.setItem(STORAGE_KEY(lang), JSON.stringify(trimmed));
  } catch {
    // quota / private-mode — silently degrade to in-memory
  }
}

export default function AskPanel({ lang }: { lang: string }) {
  const t = useTranslations('ask');
  const topics = (t.raw('topics') as string[]) ?? [];

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [used, setUsed] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Hydrate from sessionStorage once on mount (and on lang change).
  useEffect(() => {
    const cached = loadPersisted(lang);
    if (cached) {
      setMessages(cached.messages);
      setUsed(cached.used);
    } else {
      setMessages([]);
      setUsed(0);
    }
    setHydrated(true);
  }, [lang]);

  // Persist whenever messages or used change (skip the initial hydration tick
  // and skip mid-stream — partial assistant text shouldn't get saved).
  useEffect(() => {
    if (!hydrated || streaming) return;
    savePersisted(lang, { messages, used });
  }, [lang, messages, used, hydrated, streaming]);

  // body class + Esc to close
  useEffect(() => {
    document.body.classList.toggle('chat-open', open);
    return () => document.body.classList.remove('chat-open');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Auto-scroll body to bottom on new content
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  // Focus textarea when opening
  useEffect(() => {
    if (open) requestAnimationFrame(() => textareaRef.current?.focus());
  }, [open]);

  // Open via URL hash (#ask) — used by Hero "Talk to my digital twin" CTA.
  // Cleaning the hash afterward prevents back-button leaving the panel half-open.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkHash = () => {
      if (window.location.hash === '#ask') {
        setOpen(true);
        history.replaceState(
          null,
          '',
          window.location.pathname + window.location.search,
        );
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const remaining = Math.max(0, FREE_QUOTA - used);
  const overQuota = remaining <= 0;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    if (overQuota) return;

    const drawMatch = trimmed.match(DRAW_RE);
    if (drawMatch) {
      await sendDraw(drawMatch[1].trim(), trimmed);
    } else {
      await sendChat(trimmed);
    }
  }

  async function sendChat(trimmed: string) {
    setErrorMsg(null);
    setInput('');
    const userMsg: Msg = { role: 'user', text: trimmed };
    const draft: Msg = { role: 'assistant', text: '' };
    setMessages((prev) => [...prev, userMsg, draft]);
    setStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang,
          // Only send text-only messages; image messages stay client-side and
          // are not part of the chat context.
          messages: [...messages, userMsg]
            .filter((m) => !m.imageUrl)
            .map(({ role, text }) => ({ role, text })),
        }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', text: acc };
          return next;
        });
      }
      setUsed((n) => n + 1);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown';
      setErrorMsg(`${t('errorGeneric')} (${reason})`);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  async function sendDraw(prompt: string, original: string) {
    setErrorMsg(null);
    setInput('');
    const userMsg: Msg = { role: 'user', text: original };
    const draft: Msg = { role: 'assistant', text: prompt };
    setMessages((prev) => [...prev, userMsg, draft]);
    setStreaming(true);

    try {
      const res = await fetch('/api/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, lang }),
      });
      const data = (await res.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant',
          text: prompt,
          imageUrl: data.url,
        };
        return next;
      });
      setUsed((n) => n + 1);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown';
      setErrorMsg(`${t('errorGeneric')} (${reason})`);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  return (
    <>
      <button
        type="button"
        className="ask-link"
        aria-label={t('title')}
        onClick={() => setOpen(true)}
      >
        {t('floating').replace(/\s*→\s*$/, '')}
        <span className="arrow">→</span>
      </button>

      <div className="ask-backdrop" onClick={close} aria-hidden={!open} />

      <aside
        className="ask-panel"
        role="dialog"
        aria-label={t('title')}
        aria-hidden={!open}
      >
        <div className="ask-panel-header">
          <div>
            <h3 className="ask-panel-title">{t('title')}</h3>
            <div className="ask-panel-sub">{t('subtitle')}</div>
          </div>
          <button
            type="button"
            className="ask-panel-close"
            onClick={close}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="ask-panel-body" ref={bodyRef}>
          {messages.length === 0 ? (
            <>
              <div className="ask-section-label">{t('try')}</div>
              <div className="topic-chips">
                {topics.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    className="topic-chip"
                    onClick={() => {
                      setInput(q);
                      textareaRef.current?.focus();
                    }}
                  >
                    <span className="q-mark">Q.</span>
                    {q}
                  </button>
                ))}
              </div>
              <div className="ask-hint">{t('hint')}</div>
              <div className="ask-draw-hint">
                {t.rich('drawHint', {
                  code: (chunks) => <code>{chunks}</code>,
                })}
              </div>
            </>
          ) : (
            messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              const isPendingImage =
                m.role === 'assistant' && !m.imageUrl && isLast && streaming &&
                DRAW_RE.test(messages[messages.length - 2]?.text ?? '');
              return (
                <div key={i} className={`ask-msg ${m.role}`}>
                  {m.imageUrl ? (
                    <figure className="ask-msg-image">
                      <img src={m.imageUrl} alt={m.text} loading="lazy" />
                      <figcaption>{m.text}</figcaption>
                    </figure>
                  ) : isPendingImage ? (
                    <span className="ask-msg-drawing">
                      {t('drawing')}
                      <span className="cursor" aria-hidden />
                    </span>
                  ) : (
                    <>
                      {m.text}
                      {isLast && m.role === 'assistant' && streaming && (
                        <span className="cursor" aria-hidden />
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
          {errorMsg && <div className="ask-error">{errorMsg}</div>}
        </div>

        <div className="ask-panel-input">
          <div className="ask-input-row">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t('placeholder')}
              aria-label={t('placeholder')}
              disabled={streaming || overQuota}
            />
            <button
              type="button"
              className="ask-send-btn"
              onClick={() => send(input)}
              disabled={streaming || overQuota || !input.trim()}
              aria-label={t('send')}
            >
              {streaming ? '…' : '↵'}
            </button>
          </div>
        </div>

        <div className="ask-panel-footer">
          {messages.length > 0 ? (
            <span className="quota">
              {t('quota', { used: remaining, total: FREE_QUOTA })}
            </span>
          ) : (
            <span className="quota" aria-hidden style={{ visibility: 'hidden' }}>
              &nbsp;
            </span>
          )}
        </div>
      </aside>
    </>
  );
}
