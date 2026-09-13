import { notFound } from 'next/navigation';
import { Portal } from '@/components/portal';
import { getPortalData } from '@/lib/data/portal';
import { getCurrentUser } from '@/lib/auth/current-user';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getPortalData(await getCurrentUser());
  if (!data.units.some((x) => x.id === id)) notFound();
  return <Portal initialData={data} initialView="Unit" selectedId={id} />;
}
