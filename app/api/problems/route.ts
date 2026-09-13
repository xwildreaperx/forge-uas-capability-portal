import { detectRelatedProblems, submitProblem } from '@/lib/data/mutations';
import { getRequestUser } from '@/lib/auth/current-user';
import { requirePermission } from '@/lib/auth/permissions';

export async function GET(request: Request) {
  requirePermission(await getRequestUser(request), 'portal:read');
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (!query) return Response.json([]);
  return Response.json(await detectRelatedProblems({ title: query }));
}

export async function POST(request: Request) {
  try {
    const submission = await submitProblem(
      await getRequestUser(request),
      await request.json(),
    );
    return Response.json(
      {
        ...submission,
        shortDescription: submission.description,
        priority: 'Pending review',
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to submit Problem.',
      },
      { status: 400 },
    );
  }
}
