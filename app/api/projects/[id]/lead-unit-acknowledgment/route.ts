import { getRequestUser } from '@/lib/auth/current-user';
import { acknowledgeLeadUnitTransfer, resolveProjectId } from '@/lib/data/mutations';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const { id } = await context.params; return Response.json(await acknowledgeLeadUnitTransfer(await getRequestUser(request), await resolveProjectId(id))); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Unable to acknowledge transfer.' }, { status: 400 }); } }
