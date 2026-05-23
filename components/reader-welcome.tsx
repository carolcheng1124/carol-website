'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const COOKIE_NAME = 'reader_serial';
const AUTO_HIDE_MS = 8000;

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

export default function ReaderWelcome({ lang }: { lang: string }) {
  const t = useTranslations('welcome');
  const [serial, setSerial] = useState<number | null>(null);
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

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!serial) return null;

  return (
    <div
      className={`reader-welcome ${visible ? 'is-visible' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="reader-welcome-text">
        {t('greeting', { serial: serial.toLocaleString(lang) })}
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
