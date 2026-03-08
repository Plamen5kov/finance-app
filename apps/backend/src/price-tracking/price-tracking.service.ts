import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { YahooFinanceProvider } from './providers/yahoo-finance.provider';
import { CoinGeckoProvider } from './providers/coingecko.provider';
import { MetalsProvider } from './providers/metals.provider';
import { CurrencyProvider } from './providers/currency.provider';
import {
  hasTickerMetadata,
  hasCoinIdMetadata,
  hasGoldMetadata,
  GoldUnit,
} from '@finances/shared';

export interface RefreshResult {
  updated: number;
  errors: string[];
  backfilled: number;
}

@Injectable()
export class PriceTrackingService {
  private readonly logger = new Logger(PriceTrackingService.name);

  constructor(
    private prisma: PrismaService,
    private yahoo: YahooFinanceProvider,
    private coinGecko: CoinGeckoProvider,
    private metals: MetalsProvider,
    private currency: CurrencyProvider,
  ) {}

  /** Runs on the 1st of each month at 08:00 */
  @Cron('0 8 1 * *')
  async scheduledRefresh() {
    this.logger.log('Scheduled monthly price refresh starting…');
    const households = await this.prisma.household.findMany({ select: { id: true } });
    for (const h of households) {
      await this.refreshPrices(h.id);
    }
  }

  /** Refresh current prices for all trackable assets in a household */
  async refreshPrices(householdId: string): Promise<RefreshResult> {
    this.currency.clearCache();
    const assets = await this.prisma.asset.findMany({
      where: { householdId, quantity: { not: null } },
    });

    const result: RefreshResult = { updated: 0, errors: [], backfilled: 0 };
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (const asset of assets) {
      try {
        const priceResult = await this.fetchPriceForAsset(asset.metadata, asset.type);
        if (!priceResult) continue;

        const { priceEur } = priceResult;
        const quantity = asset.quantity!;
        const totalValue = Math.round(quantity * priceEur * 100) / 100;

        // Upsert snapshot for current month
        await this.upsertSnapshot(asset.id, totalValue, priceEur, monthKey);

        // Update asset's current value
        await this.prisma.asset.update({
          where: { id: asset.id },
          data: { value: totalValue },
        });

        result.updated++;
        this.logger.log(`Updated ${asset.name}: ${quantity} × €${priceEur} = €${totalValue}`);

        // Check if backfill is needed (asset has ticker but few snapshots)
        const snapshotCount = await this.prisma.assetSnapshot.count({ where: { assetId: asset.id } });
        if (snapshotCount <= 2) {
          const backfilled = await this.backfillHistory(asset.id, asset.type, asset.metadata, quantity);
          result.backfilled += backfilled;
        }
      } catch (err) {
        const msg = `Failed to update ${asset.name}: ${err instanceof Error ? err.message : String(err)}`;
        this.logger.error(msg);
        result.errors.push(msg);
      }
    }

    return result;
  }

  /** Fetch price in EUR for a given asset based on its metadata */
  private async fetchPriceForAsset(
    metadata: unknown,
    type: string,
  ): Promise<{ priceEur: number } | null> {
    if (type === 'etf' && hasTickerMetadata(metadata)) {
      const { price, currency: cur } = await this.yahoo.fetchPrice(metadata.ticker);
      const priceEur = await this.currency.toEur(price, cur);
      return { priceEur };
    }

    if (type === 'crypto' && hasCoinIdMetadata(metadata)) {
      return this.coinGecko.fetchPrice(metadata.coinId);
    }

    if (type === 'gold' && hasGoldMetadata(metadata)) {
      return this.metals.fetchGoldPrice(metadata.unit as GoldUnit);
    }

    return null;
  }

  /** Backfill historical monthly snapshots for an asset */
  private async backfillHistory(
    assetId: string,
    type: string,
    metadata: unknown,
    quantity: number,
  ): Promise<number> {
    let backfilled = 0;

    try {
      if (type === 'etf' && hasTickerMetadata(metadata)) {
        const history = await this.yahoo.fetchHistory(metadata.ticker);
        for (const point of history) {
          const priceEur = await this.currency.toEurHistorical(
            point.price,
            point.currency,
            `${point.date}-01`,
          );
          const value = Math.round(quantity * priceEur * 100) / 100;
          const created = await this.upsertSnapshotIfNew(assetId, value, priceEur, point.date);
          if (created) backfilled++;
        }
      }

      if (type === 'crypto' && hasCoinIdMetadata(metadata)) {
        const fromDate = new Date();
        fromDate.setFullYear(fromDate.getFullYear() - 5);
        const history = await this.coinGecko.fetchHistory(metadata.coinId, fromDate, new Date());
        for (const point of history) {
          const value = Math.round(quantity * point.priceEur * 100) / 100;
          const created = await this.upsertSnapshotIfNew(assetId, value, point.priceEur, point.date);
          if (created) backfilled++;
        }
      }

      if (backfilled > 0) {
        this.logger.log(`Backfilled ${backfilled} historical snapshots for asset ${assetId}`);
      }
    } catch (err) {
      this.logger.error(`Backfill failed for asset ${assetId}: ${err instanceof Error ? err.message : String(err)}`);
    }

    return backfilled;
  }

  /** Upsert snapshot for a given month (always writes) */
  private async upsertSnapshot(assetId: string, value: number, price: number, month: string) {
    const capturedAt = new Date(`${month}-01T00:00:00.000Z`);
    const existing = await this.prisma.assetSnapshot.findFirst({ where: { assetId, capturedAt } });
    if (existing) {
      return this.prisma.assetSnapshot.update({
        where: { id: existing.id },
        data: { value, price },
      });
    }
    return this.prisma.assetSnapshot.create({
      data: { assetId, value, price, capturedAt },
    });
  }

  /** Create snapshot only if one doesn't exist for that month (for backfill — don't overwrite manual entries) */
  private async upsertSnapshotIfNew(assetId: string, value: number, price: number, month: string): Promise<boolean> {
    const capturedAt = new Date(`${month}-01T00:00:00.000Z`);
    const existing = await this.prisma.assetSnapshot.findFirst({ where: { assetId, capturedAt } });
    if (existing) return false;

    await this.prisma.assetSnapshot.create({
      data: { assetId, value, price, capturedAt },
    });
    return true;
  }
}
