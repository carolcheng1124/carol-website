'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';

type Msg = { role: 'user' | 'assistant'; text: string };

const FREE_QUOTA = 5;

export default function AskPanel({ lang }: { lang: string }) {
  const t = useTranslations('ask');
  const topics = (t.raw('topics') as string[]) ?? [];

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [used, setUsed] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

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

  const remaining = Math.max(0, FREE_QUOTA - used);
  const overQuota = remaining <= 0;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    if (overQuota) return;

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
          messages: [...messages, userMsg].map(({ role, text }) => ({ role, text })),
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
            </>
          ) : (
            messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              return (
                <div key={i} className={`ask-msg ${m.role}`}>
                  {m.text}
                  {isLast && m.role === 'assistant' && streaming && (
                    <span className="cursor" aria-hidden />
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
          <span className="quota">
            {t('quota', { used: remaining, total: FREE_QUOTA })}
          </span>
          <span className="powered">{t('poweredBy')}</span>
        </div>
      </aside>
    </>
  );
}
