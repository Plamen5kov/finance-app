import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CurrencyProvider {
  private readonly logger = new Logger(CurrencyProvider.name);
  private rateCache = new Map<string, number>();

  constructor(private http: HttpService) {}

  /** Clear cache at start of each refresh run */
  clearCache() {
    this.rateCache.clear();
  }

  /** Convert an amount from one currency to EUR. Returns the amount in EUR. */
  async toEur(amount: number, fromCurrency: string): Promise<number> {
    if (fromCurrency === 'EUR') return amount;

    const cacheKey = `${fromCurrency}_EUR`;
    const cached = this.rateCache.get(cacheKey);
    if (cached !== undefined) return amount * cached;

    try {
      const { data } = await firstValueFrom(
        this.http.get<{ rates: Record<string, number> }>(
          `https://api.frankfurter.app/latest?from=${fromCurrency}&to=EUR`,
        ),
      );
      const rate = data.rates['EUR'];
      if (!rate) throw new Error(`No EUR rate for ${fromCurrency}`);
      this.rateCache.set(cacheKey, rate);
      this.logger.log(`FX rate ${fromCurrency}→EUR: ${rate}`);
      return amount * rate;
    } catch (err) {
      this.logger.error(`Failed to fetch FX rate ${fromCurrency}→EUR`, err);
      throw err;
    }
  }

  /** Convert an amount from EUR to another currency */
  async fromEur(amount: number, toCurrency: string): Promise<number> {
    if (toCurrency === 'EUR') return amount;

    const cacheKey = `EUR_${toCurrency}`;
    const cached = this.rateCache.get(cacheKey);
    if (cached !== undefined) return amount * cached;

    try {
      const { data } = await firstValueFrom(
        this.http.get<{ rates: Record<string, number> }>(
          `https://api.frankfurter.app/latest?from=EUR&to=${toCurrency}`,
        ),
      );
      const rate = data.rates[toCurrency];
      if (!rate) throw new Error(`No ${toCurrency} rate from EUR`);
      this.rateCache.set(cacheKey, rate);
      this.logger.log(`FX rate EUR→${toCurrency}: ${rate}`);
      return amount * rate;
    } catch (err) {
      this.logger.error(`Failed to fetch FX rate EUR→${toCurrency}`, err);
      throw err;
    }
  }

  /** Get historical EUR rate for a given date */
  async toEurHistorical(amount: number, fromCurrency: string, date: string): Promise<number> {
    if (fromCurrency === 'EUR') return amount;

    const cacheKey = `${fromCurrency}_EUR_${date}`;
    const cached = this.rateCache.get(cacheKey);
    if (cached !== undefined) return amount * cached;

    try {
      const { data } = await firstValueFrom(
        this.http.get<{ rates: Record<string, number> }>(
          `https://api.frankfurter.app/${date}?from=${fromCurrency}&to=EUR`,
        ),
      );
      const rate = data.rates['EUR'];
      if (!rate) throw new Error(`No EUR rate for ${fromCurrency} on ${date}`);
      this.rateCache.set(cacheKey, rate);
      return amount * rate;
    } catch (err) {
      this.logger.error(`Failed to fetch historical FX rate ${fromCurrency}→EUR for ${date}`, err);
      throw err;
    }
  }
}
