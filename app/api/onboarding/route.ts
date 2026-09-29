import { USER_COOKIE } from '@/lib/auth/current-user';
import { registerUserProfile } from '@/lib/data/mutations';

export async function POST(request: Request) {
  try {
    const user = await registerUserProfile(await request.json());
    const response = Response.json({ ok: true, userId: user.id }, { status: 201 });
    response.headers.append(
      'Set-Cookie',
      `${USER_COOKIE}=${user.id}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
    );
    return response;
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to create profile.' },
      { status: 400 },
    );
  }
}
