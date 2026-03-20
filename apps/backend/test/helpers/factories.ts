import { PrismaService } from '../../src/common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export async function createUser(
  prisma: PrismaService,
  overrides: { name?: string; email?: string; password?: string } = {},
) {
  const password = await bcrypt.hash(overrides.password ?? 'TestPassword123!', 10);
  return prisma.user.create({
    data: {
      name: overrides.name ?? 'Test User',
      email: overrides.email ?? `test-${Date.now()}@example.com`,
      password,
    },
  });
}

export async function createHouseholdWithOwner(
  prisma: PrismaService,
  overrides: { userName?: string; email?: string; householdName?: string } = {},
) {
  const user = await createUser(prisma, {
    name: overrides.userName,
    email: overrides.email,
  });

  const household = await prisma.household.create({
    data: {
      name: overrides.householdName ?? `${user.name}'s Household`,
      members: { create: { userId: user.id, role: 'owner' } },
    },
  });

  return { user, household };
}

export async function createAsset(
  prisma: PrismaService,
  householdId: string,
  userId: string,
  overrides: { name?: string; type?: string; value?: number; currency?: string } = {},
) {
  return prisma.asset.create({
    data: {
      householdId,
      userId,
      name: overrides.name ?? 'Test Asset',
      type: overrides.type ?? 'stock',
      value: overrides.value ?? 1000,
      currency: overrides.currency ?? 'EUR',
    },
  });
}

export async function createExpense(
  prisma: PrismaService,
  householdId: string,
  userId: string,
  categoryId: string,
  overrides: { amount?: number; merchant?: string; date?: Date } = {},
) {
  return prisma.expense.create({
    data: {
      householdId,
      userId,
      categoryId,
      amount: overrides.amount ?? 50,
      merchant: overrides.merchant ?? 'Test Merchant',
      date: overrides.date ?? new Date(),
    },
  });
}
