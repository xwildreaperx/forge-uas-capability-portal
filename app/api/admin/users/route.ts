import { getRequestUser } from '@/lib/auth/current-user';
import { createUserAccount } from '@/lib/data/mutations';

export async function POST(request: Request) {
  try {
    return Response.json(
      await createUserAccount(
        await getRequestUser(request),
        await request.json(),
      ),
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to create user.',
      },
      { status: 403 },
    );
  }
}
