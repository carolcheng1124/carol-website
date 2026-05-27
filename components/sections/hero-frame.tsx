'use client';

import { useEffect, useState } from 'react';

const SESSION_KEY = 'hero-seen';
const COLLAPSE_DELAY_MS = 5000;

export default function HeroFrame({ children }: { children: React.ReactNode }) {
  // Default false on server, then sync to sessionStorage in effect to avoid SSR/CSR
  // mismatch. First-paint shows full hero either way; if previously seen, the
  // useEffect immediately collapses with no transition (transition class added later).
  const [collapsed, setCollapsed] = useState(false);
  const [animateReady, setAnimateReady] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      // private mode etc — degrade to "always full hero, then collapse after 5s"
    }

    if (seen) {
      // Skip animation on subsequent navigations within the session.
      setCollapsed(true);
      return;
    }

    // Enable transitions one paint after mount so initial render is the full hero,
    // then animate into collapsed state after the delay.
    const rafId = requestAnimationFrame(() => setAnimateReady(true));
    const timeoutId = window.setTimeout(() => {
      setCollapsed(true);
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {}
    }, COLLAPSE_DELAY_MS);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, []);

  const className = [
    'hero',
    collapsed ? 'hero-collapsed' : '',
    animateReady ? 'hero-animate' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return <section className={className}>{children}</section>;
}
