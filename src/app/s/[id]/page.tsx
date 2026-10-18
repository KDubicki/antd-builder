import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SharedProject } from '@/components/share/SharedProject';
import { loadShare } from '@/lib/shares';

export const metadata: Metadata = {
  title: 'Shared project · antd-builder',
  // Links are private by obscurity; keep them out of search results.
  robots: { index: false, follow: false },
};

export default async function SharedProjectPage({ params }: PageProps<'/s/[id]'>) {
  const json = await loadShare((await params).id);
  if (json === null) notFound();
  return <SharedProject json={json} />;
}
