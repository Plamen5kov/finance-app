import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface CoinPrice {
  priceEur: number;
}

export interface HistoricalCoinPrice {
  date: string;     // YYYY-MM
  priceEur: number;
}

@Injectable()
export class CoinGeckoProvider {
  private readonly logger = new Logger(CoinGeckoProvider.name);
  private readonly BASE = 'https://api.coingecko.com/api/v3';

  constructor(private http: HttpService) {}

  /** Fetch current price in EUR for a CoinGecko coin ID */
  async fetchPrice(coinId: string): Promise<CoinPrice> {
    const { data } = await firstValueFrom(
      this.http.get<Record<string, { eur: number }>>(
        `${this.BASE}/simple/price?ids=${coinId}&vs_currencies=eur`,
      ),
    );
    const priceEur = data[coinId]?.eur;
    if (priceEur == null) throw new Error(`No price for coin: ${coinId}`);
    this.logger.log(`CoinGecko ${coinId}: €${priceEur}`);
    return { priceEur };
  }

  /** Fetch historical monthly prices via CryptoCompare (free, no key needed, 5yr+ history).
   *  Uses the symbol derived from coinId mapping. */
  async fetchHistory(coinId: string, fromDate: Date, toDate: Date, skipMonths?: Set<string>): Promise<HistoricalCoinPrice[]> {
    // Map CoinGecko coin IDs to ticker symbols
    const COIN_SYMBOLS: Record<string, string> = {
      bitcoin: 'BTC', ethereum: 'ETH', cardano: 'ADA',
      solana: 'SOL', polkadot: 'DOT', ripple: 'XRP',
      'world-mobile-token': 'WMT',
    };
    const symbol = COIN_SYMBOLS[coinId] ?? coinId.toUpperCase();

    try {
      const daysBetween = Math.ceil((toDate.getTime() - fromDate.getTime()) / (86400000));
      const { data } = await firstValueFrom(
        this.http.get<{ Data?: { Data?: { time: number; close: number }[] } }>(
          `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=EUR&limit=${Math.min(daysBetween, 2000)}`,
        ),
      );

      const points = data.Data?.Data ?? [];
      // Group by month, take first price per month
      const byMonth = new Map<string, number>();
      for (const p of points) {
        if (p.close <= 0) continue;
        const d = new Date(p.time * 1000);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key < fromDate.toISOString().slice(0, 7)) continue;
        if (skipMonths?.has(key)) continue;
        if (!byMonth.has(key)) byMonth.set(key, p.close);
      }

      const results = Array.from(byMonth.entries()).map(([date, priceEur]) => ({ date, priceEur }));
      this.logger.log(`CryptoCompare history ${symbol}: ${results.length} monthly prices`);
      return results;
    } catch (err) {
      this.logger.error(`CryptoCompare history ${symbol} failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }
}
