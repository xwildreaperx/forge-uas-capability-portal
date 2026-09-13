import { getRequestUser } from '@/lib/auth/current-user';
import { consolidateProblem } from '@/lib/data/mutations';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const { id } = await context.params; return Response.json(await consolidateProblem(await getRequestUser(request), id, await request.json())); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Unable to consolidate Problem.' }, { status: 400 }); } }
