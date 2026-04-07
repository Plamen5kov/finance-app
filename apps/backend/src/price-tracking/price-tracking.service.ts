import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { YahooFinanceProvider } from './providers/yahoo-finance.provider';
import { CoinGeckoProvider } from './providers/coingecko.provider';
import { MetalsProvider } from './providers/metals.provider';
import { CurrencyProvider } from './providers/currency.provider';
import { hasTickerMetadata, hasCoinIdMetadata, hasGoldMetadata, GoldUnit } from '@finances/shared';
import { currentMonthKey, monthRange } from '../common/utils/date-utils';

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
    const monthKey = currentMonthKey();

    for (const asset of assets) {
      try {
        const priceResult = await this.fetchPriceForAsset(asset.metadata, asset.type);
        if (!priceResult) continue;

        const { priceEur } = priceResult;
        const cur = asset.currency ?? 'EUR';
        const nativePrice = await this.currency.fromEur(priceEur, cur);
        const quantity = asset.quantity!;
        const totalValue = Math.round(quantity * nativePrice * 100) / 100;

        // Upsert snapshot for current month (values in asset's native currency)
        await this.upsertSnapshot(asset.id, totalValue, nativePrice, monthKey);

        // Update asset's current value and store latest API price in native currency
        await this.prisma.asset.update({
          where: { id: asset.id },
          data: { value: totalValue, latestPrice: nativePrice },
        });

        result.updated++;
        this.logger.log(
          `Updated ${asset.name}: ${quantity} × ${nativePrice} ${cur} = ${totalValue} ${cur}`,
        );

        // Backfill missing monthly price snapshots (never overwrites existing)
        const backfilled = await this.backfillHistory(
          asset.id,
          asset.type,
          asset.metadata,
          quantity,
          cur,
        );
        result.backfilled += backfilled;
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

  /** Backfill historical monthly snapshots for an asset.
   *  Skips API calls if coverage is already good (snapshots exist for most months). */
  private async backfillHistory(
    assetId: string,
    type: string,
    metadata: unknown,
    quantity: number,
    assetCurrency: string,
  ): Promise<number> {
    // Check coverage: count snapshots vs months since first snapshot
    const firstSnap = await this.prisma.assetSnapshot.findFirst({
      where: { assetId },
      orderBy: { capturedAt: 'asc' },
    });
    if (firstSnap) {
      const firstMonth = firstSnap.capturedAt;
      const monthsSinceFirst = Math.max(
        1,
        (new Date().getFullYear() - firstMonth.getFullYear()) * 12 +
          (new Date().getMonth() - firstMonth.getMonth()),
      );
      const snapshotCount = await this.prisma.assetSnapshot.count({ where: { assetId } });
      // If we have snapshots for most months, skip API calls
      if (snapshotCount >= monthsSinceFirst * 0.8) return 0;
    }

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
          const nativePrice = await this.currency.fromEur(priceEur, assetCurrency);
          const value = Math.round(quantity * nativePrice * 100) / 100;
          const created = await this.upsertSnapshotIfNew(assetId, value, nativePrice, point.date);
          if (created) backfilled++;
        }
      }

      if (type === 'crypto' && hasCoinIdMetadata(metadata)) {
        // Find which months are missing so we only fetch those
        const existingSnaps = await this.prisma.assetSnapshot.findMany({
          where: { assetId },
          select: { capturedAt: true },
        });
        const existingMonths = new Set(
          existingSnaps.map((s) => s.capturedAt.toISOString().slice(0, 7)),
        );

        const fromDate = firstSnap?.capturedAt ?? new Date();
        const history = await this.coinGecko.fetchHistory(
          metadata.coinId,
          fromDate,
          new Date(),
          existingMonths,
        );
        for (const point of history) {
          const nativePrice = await this.currency.fromEur(point.priceEur, assetCurrency);
          const value = Math.round(quantity * nativePrice * 100) / 100;
          const created = await this.upsertSnapshotIfNew(assetId, value, nativePrice, point.date);
          if (created) backfilled++;
        }
      }

      if (type === 'gold' && hasGoldMetadata(metadata)) {
        const fromDate = new Date();
        fromDate.setFullYear(fromDate.getFullYear() - 5);
        const history = await this.metals.fetchGoldPriceHistory(
          metadata.unit as GoldUnit,
          fromDate,
          new Date(),
        );
        for (const point of history) {
          const nativePrice = await this.currency.fromEur(point.priceEur, assetCurrency);
          const value = Math.round(quantity * nativePrice * 100) / 100;
          const created = await this.upsertSnapshotIfNew(assetId, value, nativePrice, point.date);
          if (created) backfilled++;
        }
      }

      if (backfilled > 0) {
        this.logger.log(`Backfilled ${backfilled} historical snapshots for asset ${assetId}`);
      }
    } catch (err) {
      this.logger.error(
        `Backfill failed for asset ${assetId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return backfilled;
  }

  /** Create snapshot for a given month only if none exists (never overwrites manual entries) */
  private async upsertSnapshot(assetId: string, value: number, price: number, month: string) {
    const { start, end } = monthRange(month);
    const existing = await this.prisma.assetSnapshot.findFirst({
      where: { assetId, capturedAt: { gte: start, lt: end } },
    });
    if (existing) return existing; // never overwrite
    return this.prisma.assetSnapshot.create({
      data: { assetId, value, price, capturedAt: start },
    });
  }

  /** Create snapshot only if one doesn't exist for that month (for backfill — don't overwrite manual entries) */
  private async upsertSnapshotIfNew(
    assetId: string,
    value: number,
    price: number,
    month: string,
  ): Promise<boolean> {
    const { start, end } = monthRange(month);
    const existing = await this.prisma.assetSnapshot.findFirst({
      where: { assetId, capturedAt: { gte: start, lt: end } },
    });
    if (existing) return false;

    await this.prisma.assetSnapshot.create({
      data: { assetId, value, price, capturedAt: start },
    });
    return true;
  }
}
