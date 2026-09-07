import { createProblem, detectRelatedProblems } from '@/lib/data/mutations';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (!query) return Response.json([]);
  return Response.json(await detectRelatedProblems({ title: query }));
}

export async function POST(request: Request) {
  try {
    return Response.json(await createProblem(await request.json()), {
      status: 201,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to create Problem.',
      },
      { status: 400 },
    );
  }
}
