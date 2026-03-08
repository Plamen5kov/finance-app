import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { assertHouseholdAccess } from '../common/utils/assert-household-access';
import { CreateAssetDto } from './dto/create-asset.dto';
import { isLiability } from '@finances/shared';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(householdId: string) {
    return this.prisma.asset.findMany({
      where: { householdId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(householdId: string, id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: { snapshots: { orderBy: { capturedAt: 'desc' }, take: 24 } },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.householdId !== householdId) throw new ForbiddenException();
    return asset;
  }

  async create(householdId: string, userId: string, dto: CreateAssetDto) {
    return this.prisma.asset.create({ data: { userId, householdId, ...dto } });
  }

  async update(householdId: string, id: string, dto: Partial<CreateAssetDto>) {
    await this.assertHouseholdAccess(householdId, id);
    return this.prisma.asset.update({ where: { id }, data: dto });
  }

  async remove(householdId: string, id: string) {
    await this.assertHouseholdAccess(householdId, id);
    await this.prisma.asset.delete({ where: { id } });
  }

  async getHistory(householdId: string) {
    return this.prisma.asset.findMany({
      where: { householdId },
      include: { snapshots: { orderBy: { capturedAt: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getNetWorth(householdId: string) {
    const assets = await this.prisma.asset.findMany({ where: { householdId } });
    const total = assets.reduce((sum, a) => {
      return isLiability(a.type) ? sum - a.value : sum + a.value;
    }, 0);
    return { total, assets };
  }

  async getAllocation(householdId: string) {
    const assets = await this.prisma.asset.findMany({ where: { householdId } });
    const byType: Record<string, number> = {};
    let total = 0;
    for (const asset of assets) {
      byType[asset.type] = (byType[asset.type] ?? 0) + asset.value;
      total += asset.value;
    }
    return Object.entries(byType).map(([type, value]) => ({
      type,
      value,
      pct: total > 0 ? Math.round((value / total) * 100) : 0,
    }));
  }

  async getSnapshots(householdId: string, assetId: string) {
    await this.assertHouseholdAccess(householdId, assetId);
    return this.prisma.assetSnapshot.findMany({
      where: { assetId },
      orderBy: { capturedAt: 'asc' },
    });
  }

  async addSnapshot(householdId: string, assetId: string, value: number, month: string, price?: number) {
    await this.assertHouseholdAccess(householdId, assetId);
    const capturedAt = new Date(`${month}-01T00:00:00.000Z`);
    const existing = await this.prisma.assetSnapshot.findFirst({ where: { assetId, capturedAt } });
    if (existing) {
      return this.prisma.assetSnapshot.update({ where: { id: existing.id }, data: { value, ...(price != null && { price }) } });
    }
    return this.prisma.assetSnapshot.create({ data: { assetId, value, capturedAt, ...(price != null && { price }) } });
  }

  async deleteSnapshot(householdId: string, assetId: string, snapshotId: string) {
    await this.assertHouseholdAccess(householdId, assetId);
    await this.prisma.assetSnapshot.delete({ where: { id: snapshotId } });
  }

  private assertHouseholdAccess(householdId: string, assetId: string) {
    return assertHouseholdAccess(this.prisma.asset.findUnique.bind(this.prisma.asset), householdId, assetId, 'Asset');
  }
}
