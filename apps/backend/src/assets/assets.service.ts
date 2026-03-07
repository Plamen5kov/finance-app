import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { isLiability } from '@finances/shared';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.asset.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: { snapshots: { orderBy: { capturedAt: 'desc' }, take: 24 } },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.userId !== userId) throw new ForbiddenException();
    return asset;
  }

  async create(userId: string, dto: CreateAssetDto) {
    return this.prisma.asset.create({ data: { userId, ...dto } });
  }

  async update(userId: string, id: string, dto: Partial<CreateAssetDto>) {
    await this.assertOwner(userId, id);
    return this.prisma.asset.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.asset.delete({ where: { id } });
  }

  async getHistory(userId: string) {
    return this.prisma.asset.findMany({
      where: { userId },
      include: { snapshots: { orderBy: { capturedAt: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getNetWorth(userId: string) {
    const assets = await this.prisma.asset.findMany({ where: { userId } });
    const total = assets.reduce((sum, a) => {
      return isLiability(a.type) ? sum - a.value : sum + a.value;
    }, 0);
    return { total, assets };
  }

  async getAllocation(userId: string) {
    const assets = await this.prisma.asset.findMany({ where: { userId } });
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

  async getSnapshots(userId: string, assetId: string) {
    await this.assertOwner(userId, assetId);
    return this.prisma.assetSnapshot.findMany({
      where: { assetId },
      orderBy: { capturedAt: 'asc' },
    });
  }

  async addSnapshot(userId: string, assetId: string, value: number, month: string) {
    await this.assertOwner(userId, assetId);
    const capturedAt = new Date(`${month}-01T00:00:00.000Z`);
    const existing = await this.prisma.assetSnapshot.findFirst({ where: { assetId, capturedAt } });
    if (existing) {
      return this.prisma.assetSnapshot.update({ where: { id: existing.id }, data: { value } });
    }
    return this.prisma.assetSnapshot.create({ data: { assetId, value, capturedAt } });
  }

  async deleteSnapshot(userId: string, assetId: string, snapshotId: string) {
    await this.assertOwner(userId, assetId);
    await this.prisma.assetSnapshot.delete({ where: { id: snapshotId } });
  }

  private async assertOwner(userId: string, assetId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.userId !== userId) throw new ForbiddenException();
    return asset;
  }
}
