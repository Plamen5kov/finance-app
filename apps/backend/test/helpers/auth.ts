import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

const TEST_PASSWORD = 'TestPassword123!';

export async function registerAndLogin(
  app: INestApplication,
  overrides: { name?: string; email?: string } = {},
): Promise<{ accessToken: string; userId: string }> {
  const name = overrides.name ?? 'Test User';
  const email = overrides.email ?? `test-${Date.now()}@example.com`;

  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ name, email, password: TEST_PASSWORD })
    .expect(201);

  return {
    accessToken: res.body.data.accessToken,
    userId: res.body.data.user.id,
  };
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
