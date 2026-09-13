import { getRequestUser } from '@/lib/auth/current-user';
import { createTag } from '@/lib/data/mutations';

export async function POST(request: Request) {
  try { return Response.json(await createTag(await getRequestUser(request), await request.json())); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Unable to create tag.' }, { status: 403 }); }
}
