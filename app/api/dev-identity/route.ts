import {
  DEV_USER_COOKIE,
  isDevUserSwitcherEnabled,
  userContextById,
} from '@/lib/auth/current-user';

export async function POST(request: Request) {
  if (!isDevUserSwitcherEnabled())
    return Response.json(
      { error: 'Development identity switching is disabled.' },
      { status: 404 },
    );
  const body = (await request.json()) as { userId?: unknown };
  const id = Number(body.userId);
  const user = await userContextById(id);
  if (!user)
    return Response.json({ error: 'User not found.' }, { status: 404 });
  const response = Response.json({ ok: true });
  response.headers.append(
    'Set-Cookie',
    `${DEV_USER_COOKIE}=${id}; Path=/; SameSite=Lax`,
  );
  return response;
}
