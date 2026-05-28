import { setRequestLocale } from 'next-intl/server';
import Hero from '@/components/sections/hero';
import NewsPreview from '@/components/sections/news-preview';
import Notes from '@/components/sections/notes';
import Perspectives from '@/components/sections/perspectives';
import Plans from '@/components/sections/plans';
import About from '@/components/sections/about';

// ISR: NewsPreview 读 Supabase,需要定期刷新和 /news 页面对齐
export const revalidate = 300;

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
      <NewsPreview lang={lang} />
      <Notes lang={lang} />
      <Perspectives lang={lang} />
      <Plans lang={lang} />
      <About lang={lang} />
    </>
  );
}
