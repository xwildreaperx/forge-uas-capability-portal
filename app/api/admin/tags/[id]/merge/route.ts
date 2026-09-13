import { getRequestUser } from '@/lib/auth/current-user';
import { mergeTag } from '@/lib/data/mutations';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const { id } = await context.params; return Response.json(await mergeTag(await getRequestUser(request), Number(id), await request.json())); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Unable to merge Tag.' }, { status: 400 }); } }
