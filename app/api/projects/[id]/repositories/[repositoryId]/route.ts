import { getRequestUser } from '@/lib/auth/current-user';
import { correctRepository } from '@/lib/data/mutations';
export async function PATCH(request: Request, context: { params: Promise<{ repositoryId: string }> }) { try { const { repositoryId } = await context.params; return Response.json(await correctRepository(await getRequestUser(request), Number(repositoryId), await request.json())); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Unable to correct artifact.' }, { status: 400 }); } }
