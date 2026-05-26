import { setRequestLocale } from 'next-intl/server';
import Hero from '@/components/sections/hero';
import Insights from '@/components/sections/insights';
import Perspectives from '@/components/sections/perspectives';
import Plans from '@/components/sections/plans';
import About from '@/components/sections/about';

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);

  return (
    <>
      <Hero lang={lang} />
      <Insights lang={lang} />
      <Perspectives lang={lang} />
      <Plans lang={lang} />
      <About lang={lang} />
    </>
  );
}
