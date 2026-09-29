import { createProject } from '@/lib/data/mutations';
import { getRequestUser } from '@/lib/auth/current-user';

export async function POST(request: Request) {
  try {
    return Response.json(
      await createProject(await getRequestUser(request), await request.json()),
      {
        status: 201,
      },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to create Project.',
      },
      { status: 400 },
    );
  }
}
