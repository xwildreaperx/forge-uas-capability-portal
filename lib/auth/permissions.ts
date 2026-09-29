import type { AccountStatus, UserRole } from '@prisma/client';

export type CurrentUserContext = {
  id: number;
  trackingId: string;
  displayName: string;
  identifier: string;
  role: UserRole;
  status: AccountStatus;
  primaryUnitId: number | null;
  unitIds: number[];
  administeredUnitIds: number[];
  projectIds: number[];
};

export type Permission =
  | 'portal:read'
  | 'problem:submit'
  | 'project:create'
  | 'project:edit'
  | 'submission:review'
  | 'user:manage'
  | 'unit:manage'
  | 'platform:admin';

const rolePermissions: Record<UserRole, Permission[]> = {
  CONTRIBUTOR: ['portal:read', 'problem:submit'],
  PROJECT_USER: [
    'portal:read',
    'problem:submit',
    'project:create',
    'project:edit',
  ],
  UNIT_ADMIN: [
    'portal:read',
    'problem:submit',
    'project:create',
    'project:edit',
    'submission:review',
    'user:manage',
    'unit:manage',
  ],
  SYSTEM_ADMIN: [
    'portal:read',
    'problem:submit',
    'project:create',
    'project:edit',
    'submission:review',
    'user:manage',
    'unit:manage',
    'platform:admin',
  ],
};

export function hasPermission(
  user: CurrentUserContext | null,
  permission: Permission,
) {
  return Boolean(
    user &&
    user.status === 'ACTIVE' &&
    rolePermissions[user.role].includes(permission),
  );
}

export function requirePermission(
  user: CurrentUserContext | null,
  permission: Permission,
) {
  if (!user) throw new Error('A current user is required.');
  if (user.status !== 'ACTIVE') throw new Error('This account is not active.');
  if (!hasPermission(user, permission))
    throw new Error('You do not have permission to perform this action.');
  return user;
}

export function canAccessUnit(user: CurrentUserContext, unitId: number) {
  return (
    user.role === 'SYSTEM_ADMIN' || user.administeredUnitIds.includes(unitId)
  );
}

export function canEditProject(
  user: CurrentUserContext,
  project: { id: number; leadUnitId: number; createdByUserId: number | null },
) {
  if (!hasPermission(user, 'project:edit')) return false;
  return (
    user.role === 'SYSTEM_ADMIN' ||
    project.createdByUserId === user.id ||
    user.projectIds.includes(project.id) ||
    (user.role === 'UNIT_ADMIN' &&
      user.administeredUnitIds.includes(project.leadUnitId))
  );
}

export function assertProjectEdit(
  user: CurrentUserContext | null,
  project: { id: number; leadUnitId: number; createdByUserId: number | null },
) {
  requirePermission(user, 'project:edit');
  if (!canEditProject(user!, project))
    throw new Error(
      'You do not have permission to edit this Project. Contact the Project Lead or your Unit Administrator if responsibility needs to change.',
    );
  return user!;
}
