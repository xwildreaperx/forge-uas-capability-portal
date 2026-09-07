import { Portal } from '@/components/portal';
import { getPortalData } from '@/lib/data/portal';

export const dynamic = 'force-dynamic';

export default async function Home() {
  return <Portal initialData={await getPortalData()} />;
}
