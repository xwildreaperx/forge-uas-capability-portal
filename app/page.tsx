import { Portal } from '@/components/portal';
import { getPortalData } from '@/lib/data/portal';
import { getCurrentUser } from '@/lib/auth/current-user';
import { Onboarding } from '@/components/onboarding';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    const units = await db.unit.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, trackingId: true, name: true, abbreviation: true },
    });
    return <Onboarding units={units} />;
  }
  const { view } = await searchParams;
  const allowed = ['Dashboard', 'Explore', 'Problems', 'Projects', 'Units', 'Map', 'Capability Graph', 'Activity', 'Administration'];
  return <Portal initialData={await getPortalData(user)} initialView={allowed.includes(view ?? '') ? view : 'Dashboard'} />;
}
