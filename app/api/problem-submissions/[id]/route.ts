import { getRequestUser } from '@/lib/auth/current-user';
import { reviewProblemSubmission } from '@/lib/data/mutations';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return Response.json(
      await reviewProblemSubmission(
        await getRequestUser(request),
        id,
        await request.json(),
      ),
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to review submission.',
      },
      { status: 403 },
    );
  }
}
