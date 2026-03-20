import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { assertHouseholdAccess } from '../common/utils/assert-household-access';
import { round2 } from '../common/utils/money';
import { CreateAssetDto } from './dto/create-asset.dto';
import { isLiability } from '@finances/shared';

/** Approximate conversion to EUR for summary display */
const TO_EUR: Record<string, number> = { BGN: 1 / 1.95583, USD: 0.92, GBP: 1.17 };

export function toEur(amount: number, currency?: string | null): number {
  if (!currency || currency === 'EUR') return amount;
  return round2(amount * (TO_EUR[currency] ?? 1));
}

/** Compute real asset value from snapshots (DCA: sum(qty) × latestPrice) */
export function computeAssetValue(
  asset: { value: number; latestPrice?: number | null },
  snapshots: { quantity?: number | null; price?: number | null }[],
): { value: number; quantity?: number } {
  if (!snapshots.length) return { value: asset.value };
  const totalQty = snapshots.reduce((s, sn) => s + (sn.quantity ?? 0), 0);
  if (totalQty <= 0) return { value: asset.value };
  const price = asset.latestPrice ?? snapshots[0]?.price ?? null;
  const value = price != null ? round2(totalQty * price) : asset.value;
  return { value, quantity: Math.round(totalQty * 10000) / 10000 };
}

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  /** Fetch assets with snapshots and compute real DCA values */
  async findAllWithValues(householdId: string) {
    const assets = await this.prisma.asset.findMany({
      where: { householdId },
      orderBy: { createdAt: 'asc' },
      include: {
        snapshots: {
          select: { quantity: true, price: true },
          orderBy: { capturedAt: 'desc' },
        },
      },
    });

    return assets.map(({ snapshots, ...asset }) => {
      const computed = computeAssetValue(asset, snapshots);
      return { ...asset, ...computed };
    });
  }

  async findAll(householdId: string) {
    return this.findAllWithValues(householdId);
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
    const assets = await this.findAllWithValues(householdId);
    const total = assets.reduce((sum, a) => {
      const eurValue = toEur(a.value, a.currency);
      return isLiability(a.type) ? sum - eurValue : sum + eurValue;
    }, 0);
    return { total, assets };
  }

  async getAllocation(householdId: string) {
    const assets = await this.findAllWithValues(householdId);
    const byType: Record<string, number> = {};
    let total = 0;
    for (const asset of assets) {
      const eurValue = toEur(asset.value, asset.currency);
      byType[asset.type] = (byType[asset.type] ?? 0) + eurValue;
      total += eurValue;
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

  async addSnapshot(
    householdId: string,
    assetId: string,
    value: number,
    date: string,
    price?: number,
    quantity?: number,
  ) {
    await this.assertHouseholdAccess(householdId, assetId);
    const capturedAt = new Date(`${date}T00:00:00.000Z`);
    const optionals = {
      ...(price != null && { price }),
      ...(quantity != null && { quantity }),
    };
    const existing = await this.prisma.assetSnapshot.findFirst({ where: { assetId, capturedAt } });
    if (existing) {
      return this.prisma.assetSnapshot.update({
        where: { id: existing.id },
        data: { value, ...optionals },
      });
    }
    return this.prisma.assetSnapshot.create({ data: { assetId, value, capturedAt, ...optionals } });
  }

  async deleteSnapshot(householdId: string, assetId: string, snapshotId: string) {
    await this.assertHouseholdAccess(householdId, assetId);
    const snapshot = await this.prisma.assetSnapshot.findUnique({ where: { id: snapshotId } });
    if (!snapshot) throw new NotFoundException('Snapshot not found');
    if (snapshot.assetId !== assetId) throw new ForbiddenException();
    await this.prisma.assetSnapshot.delete({ where: { id: snapshotId } });
  }

  private assertHouseholdAccess(householdId: string, assetId: string) {
    return assertHouseholdAccess(
      this.prisma.asset.findUnique.bind(this.prisma.asset),
      householdId,
      assetId,
      'Asset',
    );
  }
}
