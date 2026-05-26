import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import Nav from '@/components/nav';
import Footer from '@/components/footer';
import ScrollProgress from '@/components/scroll-progress';
import AskPanel from '@/components/ask-panel';
import ReaderWelcome from '@/components/reader-welcome';
import '../globals.css';

// Fonts loaded via <link> in <head> below (not next/font/google) to avoid
// build-time Google Fonts download failures in restricted networks.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shanshanbuchi.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) {
    return {};
  }
  const t = await getTranslations({ locale: lang, namespace: 'meta' });
  const url = `${SITE_URL}/${lang}`;

  // hreflang map for international SEO — every locale + x-default → en
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = `${SITE_URL}/${l}`;
  }
  languages['x-default'] = `${SITE_URL}/${routing.defaultLocale}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      type: 'website',
      url,
      siteName: t('siteName'),
      title: t('title'),
      description: t('description'),
      locale: lang,
      images: ['/icon.png'],
    },
    twitter: {
      card: 'summary',
      title: t('title'),
      description: t('description'),
      images: ['/icon.png'],
    },
  };
}

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
