import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import Nav from '@/components/nav';
import Footer from '@/components/footer';
import ScrollProgress from '@/components/scroll-progress';
import AskPanel from '@/components/ask-panel';
import ReaderWelcome from '@/components/reader-welcome';
import '../globals.css';

// Fonts loaded via <link> in <head> below (not next/font/google) to avoid
// build-time Google Fonts download failures in restricted networks.

export const metadata: Metadata = {
  title: "Carol — A Slower Pulse",
  description: '在被加速的世界里,做一份慢下来的观察。',
};

export function generateStaticParams() {
  return routing.locales.map((lang) => ({ lang }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) {
    notFound();
  }
  setRequestLocale(lang);

  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..700,0..100;1,9..144,300..700,0..100&family=Inter:wght@300;400;500;600&family=Noto+Serif+SC:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NextIntlClientProvider>
          <ScrollProgress />
          <ReaderWelcome lang={lang} />
          <Nav lang={lang} />
          <main>{children}</main>
          <Footer />
          <AskPanel lang={lang} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
