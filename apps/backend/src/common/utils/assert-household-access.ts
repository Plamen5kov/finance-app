import { NotFoundException, ForbiddenException } from '@nestjs/common';

interface HouseholdOwned {
  id: string;
  householdId: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaFindUnique = (args: { where: { id: string } }) => any;

export async function assertHouseholdAccess(
  findUnique: PrismaFindUnique,
  householdId: string,
  resourceId: string,
  label: string,
): Promise<HouseholdOwned> {
  const record = await findUnique({ where: { id: resourceId } });
  if (!record) throw new NotFoundException(`${label} not found`);
  if (record.householdId !== householdId) throw new ForbiddenException();
  return record;
}
