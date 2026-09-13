import { cookies } from 'next/headers';
import { db } from '../db.ts';
import type { CurrentUserContext } from './permissions.ts';
import { isDevUserSwitcherEnabled } from './config.ts';

export { isDevUserSwitcherEnabled } from './config.ts';

export const DEV_USER_COOKIE = 'forge_dev_user';
export async function userContextById(
  id: number,
): Promise<CurrentUserContext | null> {
  const user = await db.user.findUnique({
    where: { id },
    include: { unitMemberships: true, projectMemberships: true },
  });
  if (!user) return null;
  return {
    id: user.id,
    trackingId: user.trackingId,
    displayName: user.displayName,
    identifier: user.identifier,
    role: user.role,
    status: user.status,
    primaryUnitId: user.primaryUnitId,
    unitIds: user.unitMemberships.map((item) => item.unitId),
    administeredUnitIds: user.unitMemberships
      .filter((item) => item.isAdmin)
      .map((item) => item.unitId),
    projectIds: user.projectMemberships.map((item) => item.projectId),
  };
}

export async function getCurrentUser(): Promise<CurrentUserContext | null> {
  if (!isDevUserSwitcherEnabled()) return null;
  const selected = Number((await cookies()).get(DEV_USER_COOKIE)?.value);
  if (Number.isInteger(selected) && selected > 0)
    return userContextById(selected);
  const fallback = await db.user.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: [{ role: 'desc' }, { id: 'asc' }],
    select: { id: true },
  });
  return fallback ? userContextById(fallback.id) : null;
}

export async function getRequestUser(request: Request) {
  if (!isDevUserSwitcherEnabled()) return null;
  const explicit = Number(request.headers.get('x-forge-dev-user'));
  if (Number.isInteger(explicit) && explicit > 0)
    return userContextById(explicit);
  const match = request.headers
    .get('cookie')
    ?.match(/(?:^|;\s*)forge_dev_user=(\d+)/);
  if (match) return userContextById(Number(match[1]));
  return getCurrentUser();
}
