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

  /** Fetch historical monthly prices. Returns one price per month. */
  async fetchHistory(coinId: string, fromDate: Date, toDate: Date): Promise<HistoricalCoinPrice[]> {
    const from = Math.floor(fromDate.getTime() / 1000);
    const to = Math.floor(toDate.getTime() / 1000);

    const { data } = await firstValueFrom(
      this.http.get<{ prices: [number, number][] }>(
        `${this.BASE}/coins/${coinId}/market_chart/range?vs_currency=eur&from=${from}&to=${to}`,
      ),
    );

    // Group by month and take the first price of each month
    const byMonth = new Map<string, number>();
    for (const [timestamp, price] of data.prices) {
      const d = new Date(timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth.has(key)) {
        byMonth.set(key, price);
      }
    }

    return Array.from(byMonth.entries()).map(([date, priceEur]) => ({ date, priceEur }));
  }
}
