import { execFileSync } from 'child_process';

const TEST_DATABASE_URL = 'postgresql://testuser:testpass@localhost:5434/finances_test';

export default async function globalSetup() {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long!!';
  process.env.JWT_EXPIRATION = '1h';
  process.env.NODE_ENV = 'test';

  // Push schema to test database (clean reset, no migration history needed)
  try {
    execFileSync('npx', ['prisma', 'db', 'push', '--force-reset', '--skip-generate'], {
      cwd: __dirname + '/..',
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: 'pipe',
    });
  } catch (err: any) {
    console.error('Failed to push schema:', err.stderr?.toString());
    throw err;
  }
}
