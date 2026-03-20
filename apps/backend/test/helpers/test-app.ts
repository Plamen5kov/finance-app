import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';

export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
  module: TestingModule;
}> {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');
  await app.init();

  const prisma = module.get(PrismaService);

  return { app, prisma, module };
}

/**
 * Truncate all tables between tests.
 * Preserves the schema but removes all data.
 */
export async function cleanDatabase(prisma: PrismaService) {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename != '_prisma_migrations'
  `;

  await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
  for (const { tablename } of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
  }
  await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
}
