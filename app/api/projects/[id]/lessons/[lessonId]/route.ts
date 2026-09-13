import { getRequestUser } from '@/lib/auth/current-user';
import { correctLesson } from '@/lib/data/mutations';
export async function PATCH(request: Request, context: { params: Promise<{ lessonId: string }> }) { try { const { lessonId } = await context.params; return Response.json(await correctLesson(await getRequestUser(request), Number(lessonId), await request.json())); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Unable to correct Lesson.' }, { status: 400 }); } }
