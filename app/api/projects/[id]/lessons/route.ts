import { addLesson, resolveProjectId } from '@/lib/data/mutations';
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return Response.json(
      await addLesson(await resolveProjectId(id), await request.json()),
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unable to add lesson.',
      },
      { status: 400 },
    );
  }
}
