import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface StockPrice {
  price: number;
  currency: string;
}

export interface HistoricalStockPrice {
  date: string;     // YYYY-MM
  price: number;
  currency: string;
}

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: { currency: string; regularMarketPrice: number };
      timestamp?: number[];
      indicators: {
        quote: Array<{ close: (number | null)[] }>;
      };
    }>;
  };
}

@Injectable()
export class YahooFinanceProvider {
  private readonly logger = new Logger(YahooFinanceProvider.name);
  private readonly BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

  constructor(private http: HttpService) {}

  /** Fetch current price for a Yahoo Finance ticker */
  async fetchPrice(ticker: string): Promise<StockPrice> {
    const { data } = await firstValueFrom(
      this.http.get<YahooChartResponse>(
        `${this.BASE}/${encodeURIComponent(ticker)}?range=1d&interval=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } },
      ),
    );
    const result = data.chart.result?.[0];
    if (!result) throw new Error(`No data for ticker: ${ticker}`);

    const price = result.meta.regularMarketPrice;
    const currency = result.meta.currency;
    this.logger.log(`Yahoo ${ticker}: ${price} ${currency}`);
    return { price, currency };
  }

  /** Fetch historical monthly closing prices (up to 5 years) */
  async fetchHistory(ticker: string): Promise<HistoricalStockPrice[]> {
    const { data } = await firstValueFrom(
      this.http.get<YahooChartResponse>(
        `${this.BASE}/${encodeURIComponent(ticker)}?range=5y&interval=1mo`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } },
      ),
    );
    const result = data.chart.result?.[0];
    if (!result?.timestamp) return [];

    const currency = result.meta.currency;
    const closes = result.indicators.quote[0]?.close ?? [];
    const prices: HistoricalStockPrice[] = [];

    for (let i = 0; i < result.timestamp.length; i++) {
      const close = closes[i];
      if (close == null) continue;
      const d = new Date(result.timestamp[i] * 1000);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      prices.push({ date, price: close, currency });
    }

    return prices;
  }
}
