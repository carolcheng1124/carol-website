'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const COOKIE_NAME = 'reader_serial';
const AUTO_HIDE_MS = 8000;
const COUNT_UP_MS = 700;

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

function writeCookie(name: string, value: string) {
  // Non-httpOnly so this component can read on next visit. Not sensitive —
  // worst case a user spoofs their own welcome number.
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=31536000; path=/; samesite=lax`;
}

// Time-bucket greeting keys are only present in zh.json. Other locales
// fall back to the single `greeting` key.
function pickGreetingKey(lang: string): 'morning' | 'noon' | 'afternoon' | 'evening' | 'greeting' {
  if (lang !== 'zh') return 'greeting';
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 13) return 'noon';
  if (h >= 13 && h < 18) return 'afternoon';
  return 'evening';
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function ReaderWelcome({ lang }: { lang: string }) {
  const t = useTranslations('welcome');
  const [serial, setSerial] = useState<number | null>(null);
  const [displayNum, setDisplayNum] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const cached = readCookie(COOKIE_NAME);
    if (cached) {
      const n = Number(cached);
      if (Number.isFinite(n) && n > 0) {
        setSerial(n);
        setVisible(true);
        return;
      }
    }

    (async () => {
      try {
        const res = await fetch('/api/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lang }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { serial?: number | null };
        if (cancelled || !data.serial) return;
        writeCookie(COOKIE_NAME, String(data.serial));
        setSerial(data.serial);
        setVisible(true);
      } catch {
        // silent — no banner if request fails
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lang]);

  // Count-up animation: 0 → serial over COUNT_UP_MS, ease-out cubic.
  // Respects prefers-reduced-motion.
  useEffect(() => {
    if (serial == null) return;
    if (prefersReducedMotion()) {
      setDisplayNum(serial);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= COUNT_UP_MS) {
        setDisplayNum(serial);
        return;
      }
      const p = elapsed / COUNT_UP_MS;
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayNum(Math.round(serial * eased));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [serial]);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!serial) return null;

  const greetingKey = pickGreetingKey(lang);

  return (
    <div
      className={`reader-welcome ${visible ? 'is-visible' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="reader-welcome-text">
        {t.rich(greetingKey, {
          serial: displayNum.toLocaleString(lang),
          num: (chunks) => <span className="reader-welcome-num">{chunks}</span>,
        })}
      </span>
      <button
        type="button"
        className="reader-welcome-close"
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
