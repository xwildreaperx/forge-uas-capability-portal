import { spawnSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const databases = [resolve('prisma/.test-demo.db'), resolve('prisma/.test-operational.db')];

function run(args: string[], database: string) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: `file:${database.replaceAll('\\', '/')}` },
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function prepare(database: string) {
  const sqlite = new DatabaseSync(database);
  try {
    sqlite.exec('PRAGMA foreign_keys=OFF;');
    for (const directory of readdirSync(resolve('prisma/migrations')).sort()) {
      const migration = resolve('prisma/migrations', directory, 'migration.sql');
      if (existsSync(migration)) sqlite.exec(readFileSync(migration, 'utf8'));
    }
    sqlite.exec('PRAGMA foreign_keys=ON;');
  } finally {
    sqlite.close();
  }
}

try {
  for (const database of databases) if (existsSync(database)) unlinkSync(database);
  prepare(databases[0]);
  run(['--experimental-strip-types', 'prisma/seed.ts'], databases[0]);
  run(['--test', '--experimental-strip-types', 'tests/domain.test.ts'], databases[0]);
  prepare(databases[1]);
  run(['--experimental-strip-types', 'prisma/seed-clean.ts'], databases[1]);
  run(['--experimental-strip-types', 'prisma/seed-clean.ts'], databases[1]);
  run(['--test', '--experimental-strip-types', 'tests/operational.test.ts'], databases[1]);
} finally {
  for (const database of databases) if (existsSync(database)) unlinkSync(database);
}
