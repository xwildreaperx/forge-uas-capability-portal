import { Portal } from '@/components/portal';
import { getPortalData } from '@/lib/data/portal';
import { getCurrentUser } from '@/lib/auth/current-user';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await getCurrentUser();
  const { view } = await searchParams;
  const allowed = ['Dashboard', 'Explore', 'Problems', 'Projects', 'Units', 'Map', 'Capability Graph', 'Activity', 'Administration'];
  return <Portal initialData={await getPortalData(user)} initialView={allowed.includes(view ?? '') ? view : 'Dashboard'} />;
}
