import { getRequestUser } from '@/lib/auth/current-user';
import { manageUserUnitMembership } from '@/lib/data/mutations';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return Response.json(
      await manageUserUnitMembership(
        await getRequestUser(request),
        Number(id),
        await request.json(),
      ),
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to update Unit membership.',
      },
      { status: 403 },
    );
  }
}
