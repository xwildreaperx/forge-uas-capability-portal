import {
  detectRelatedProblems,
  ProblemMatchReviewRequired,
  submitProblem,
} from '@/lib/data/mutations';
import { getRequestUser } from '@/lib/auth/current-user';
import { requirePermission } from '@/lib/auth/permissions';

export async function GET(request: Request) {
  requirePermission(await getRequestUser(request), 'portal:read');
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  const description =
    new URL(request.url).searchParams.get('description')?.trim() ?? '';
  if (!query && !description) return Response.json([]);
  return Response.json(
    await detectRelatedProblems({ title: query, description }),
  );
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
    if (error instanceof ProblemMatchReviewRequired)
      return Response.json(
        { error: error.message, matches: error.matches },
        { status: 409 },
      );
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to submit Problem.',
      },
      { status: 400 },
    );
  }
}
