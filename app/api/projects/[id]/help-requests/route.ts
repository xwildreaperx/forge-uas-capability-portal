import { createHelpRequest, resolveProjectId } from '@/lib/data/mutations';
import { getRequestUser } from '@/lib/auth/current-user';
import { NextResponse } from 'next/server';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = await createHelpRequest(await getRequestUser(request), await resolveProjectId(id), await request.json());
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create Help Request.' }, { status: 400 });
  }
}
