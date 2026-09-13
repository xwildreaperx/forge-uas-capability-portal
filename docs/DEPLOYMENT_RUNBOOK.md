# FORGE Deployment and Recovery Runbook

FORGE is currently a local SQLite prototype for **UNCLASSIFIED INFORMATION ONLY**. Its Prisma schema, migrations, server-side authorization, and clean initializer support a future hosted deployment, but this repository does not supply production identity, database, backup, file-storage, HTTPS, proxy, or disaster-recovery infrastructure.

## Identity and authorization handoff

A future identity provider must supply a stable, server-trusted identifier. The server maps that identifier to an active FORGE `User` profile and builds current-user context from the stored role and relational Unit/Project scopes. Never accept a client-provided role as authority. Pending or Disabled profiles must not receive action permissions. The development identity switcher is demonstration tooling and must remain disabled in production.

System Administrator succession:

1. Create the replacement FORGE profile.
2. Map its stable external identity.
3. Assign System Administrator authority.
4. Activate the profile.
5. Verify real access through the production identity path.
6. Confirm at least one other active System Administrator remains; two verified administrators are preferred.
7. Disable or downgrade the departing administrator.
8. Preserve the old profile and all attribution history.

Retire the generic bootstrap profile only after real System Administrator access is verified, another active System Administrator exists, preferably two trusted real administrators are available, and the supported last-admin invariant has been tested in the deployed environment. Never auto-retire it.

## Local SQLite backup and restore

`DATABASE_URL` determines the database path; the default development file is `prisma/dev.db` and is intentionally untracked. Stop FORGE before copying the database so the file is consistent. Copy the database to an access-controlled backup location and record its date and application commit. To restore, stop FORGE, preserve the current file separately, copy the selected backup into the configured path, then run `pnpm prisma migrate status` and `pnpm prisma migrate deploy` before restarting. Verify operational counts and Platform Integrity. This is prototype recovery guidance, not production disaster recovery.

FORGE owns schema migrations, the application data model, integrity checks, and the optional System-only JSON metadata export. The deployment organization owns database backups, restore testing, cadence, retention, access control, and infrastructure disaster recovery.

## Initialization safety

`pnpm db:seed:clean` and `pnpm db:seed:demo` are destructive and operate against the configured `DATABASE_URL`. Confirm the target database and intended mode first. The clean seed creates nine approved Units, twelve canonical Problems, no Projects, and one bootstrap profile. The demo seed is fictional and remains separate.

## Production transition notes

SQLite remains appropriate only for this local prototype. Prisma should ease a PostgreSQL transition, but every migration must be validated against PostgreSQL; concurrency and locking assumptions must be retested; and tracking-counter allocation requires production concurrency validation.

FORGE stores reference metadata, not production file blobs. External repositories and references remain supported. Documentation Availability controls presentation and contact behavior but never grants access. Future object/document storage requires a separate deployment and information-security design.

## Deployment checklist

- Install dependencies and validate Prisma schema/migrations.
- Choose and test the production database; do not treat SQLite as production-ready.
- Configure environment variables without committing `.env` files or credentials.
- Integrate server-trusted authentication and stable identity mapping.
- Confirm client-provided roles cannot authorize requests.
- Assign and verify at least two trusted System Administrators where practical.
- Retire the bootstrap profile only through the succession procedure.
- Disable the development identity switcher in production.
- Initialize the intended clean operational dataset only after confirming the database target.
- Establish database backup, retention, restore testing, and disaster recovery.
- Decide whether external references remain sufficient or approved file storage is required.
- Establish and train users on the UNCLASSIFIED information-handling policy.
- Configure HTTPS, reverse proxy, host hardening, monitoring, and infrastructure controls as deployment-owner responsibilities.
- Run automated tests, production build, Platform Integrity, and operational-data audit before release.
