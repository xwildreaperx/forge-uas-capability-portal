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
  const project = data.projects.find((item) => item.id === id);
  if (!project) notFound();
  return (
    <Portal
      key={project.updatedAt}
      initialData={data}
      initialView="Project"
      selectedId={id}
    />
  );
}
