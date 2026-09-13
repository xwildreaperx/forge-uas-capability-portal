import { Portal } from '@/components/portal';
import { getPortalData } from '@/lib/data/portal';
import { getCurrentUser } from '@/lib/auth/current-user';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getCurrentUser();
  return <Portal initialData={await getPortalData(user)} />;
}
