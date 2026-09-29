import { resolveProjectId, updateHelpRequest } from '@/lib/data/mutations';
import { getRequestUser } from '@/lib/auth/current-user';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, context: { params: Promise<{ id: string; helpRequestId: string }> }) {
  try {
    const { id, helpRequestId } = await context.params;
    const result = await updateHelpRequest(await getRequestUser(request), await resolveProjectId(id), Number(helpRequestId), await request.json());
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update Help Request.' }, { status: 400 });
  }
}
