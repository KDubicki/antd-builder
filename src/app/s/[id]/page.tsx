import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { SharedProject } from '@/components/share/SharedProject';
import { loadShare } from '@/lib/shares';
import { shareMetadata } from '@/lib/shares/metadata';

/** One read per request, shared by the metadata and the page. */
const getShare = cache(loadShare);

export async function generateMetadata({ params }: PageProps<'/s/[id]'>): Promise<Metadata> {
  const share = await getShare((await params).id);
  return shareMetadata(share?.json ?? null);
}

export default async function SharedProjectPage({ params }: PageProps<'/s/[id]'>) {
  const share = await getShare((await params).id);
  if (share === null) notFound();
  return <SharedProject json={share.json} expiresAt={share.expiresAt} />;
}
