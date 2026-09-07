import { notFound } from 'next/navigation';
import { Portal } from '@/components/portal';
import { getPortalData } from '@/lib/data/portal';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getPortalData();
  if (!data.problems.some((x) => x.id === id)) notFound();
  return <Portal initialData={data} initialView="Problem" selectedId={id} />;
}
