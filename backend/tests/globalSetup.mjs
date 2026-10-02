import { execSync } from 'node:child_process';

const TEST_DB =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/inventory_db_test?schema=public';

export default function globalSetup() {
  execSync('npx prisma db push --force-reset --accept-data-loss --skip-generate', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: TEST_DB },
    stdio: 'inherit',
  });
}
