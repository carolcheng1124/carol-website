// Root layout is intentionally minimal — the real <html>/<body>/<font> wrapper
// lives in app/[lang]/layout.tsx so that the lang attribute matches the locale.
// See: https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
