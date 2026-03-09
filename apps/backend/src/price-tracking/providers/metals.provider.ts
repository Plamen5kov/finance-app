import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GoldUnit } from '@finances/shared';

export interface MetalPrice {
  priceEur: number; // price per unit in EUR
}

export interface HistoricalMetalPrice {
  date: string;     // YYYY-MM
  priceEur: number;
}

// 1 troy ounce = 31.1035 grams
const GRAMS_PER_TROY_OUNCE = 31.1035;

@Injectable()
export class MetalsProvider {
  private readonly logger = new Logger(MetalsProvider.name);

  constructor(private http: HttpService) {}

  /**
   * Fetch current gold price in EUR per specified unit.
   * Uses NBP (Polish central bank) gold price API (PLN/gram) + frankfurter.app for PLN→EUR conversion.
   * Both are free, no API key needed.
   */
  async fetchGoldPrice(unit: GoldUnit): Promise<MetalPrice> {
    try {
      // NBP gives gold price in PLN per gram (24k)
      const { data: nbpData } = await firstValueFrom(
        this.http.get<{ data: string; cena: number }[]>(
          'https://api.nbp.pl/api/cenyzlota/?format=json',
        ),
      );
      const plnPerGram = nbpData[0].cena;

      // Convert PLN to EUR via frankfurter.app (ECB rates)
      const { data: fxData } = await firstValueFrom(
        this.http.get<{ rates: { EUR: number } }>(
          'https://api.frankfurter.app/latest?from=PLN&to=EUR',
        ),
      );
      const plnToEur = fxData.rates.EUR;

      const eurPerGram = plnPerGram * plnToEur;
      const priceEur = unit === 'g' ? eurPerGram : eurPerGram * GRAMS_PER_TROY_OUNCE;
      const rounded = Math.round(priceEur * 100) / 100;

      this.logger.log(`Gold price: €${rounded}/${unit} (NBP: ${plnPerGram} PLN/g × ${plnToEur} EUR/PLN)`);
      return { priceEur: rounded };
    } catch (err) {
      this.logger.error(`Gold price fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      // Fallback: approximate current price (~€142/g as of Mar 2026)
      const fallbackPerGram = 142;
      const priceEur = unit === 'g' ? fallbackPerGram : fallbackPerGram * GRAMS_PER_TROY_OUNCE;
      this.logger.warn(`Using fallback gold price: €${priceEur}/${unit}`);
      return { priceEur: Math.round(priceEur * 100) / 100 };
    }
  }

  /**
   * Fetch historical monthly gold prices in EUR per specified unit.
   * NBP API supports date ranges up to 367 days, so we chunk by year.
   */
  async fetchGoldPriceHistory(unit: GoldUnit, fromDate: Date, toDate: Date): Promise<HistoricalMetalPrice[]> {
    const results: HistoricalMetalPrice[] = [];

    try {
      // Chunk into 365-day ranges (NBP limit)
      const chunks: { start: string; end: string }[] = [];
      const cursor = new Date(fromDate);
      while (cursor < toDate) {
        const chunkEnd = new Date(cursor);
        chunkEnd.setDate(chunkEnd.getDate() + 364);
        if (chunkEnd > toDate) chunkEnd.setTime(toDate.getTime());
        chunks.push({
          start: cursor.toISOString().slice(0, 10),
          end: chunkEnd.toISOString().slice(0, 10),
        });
        cursor.setDate(cursor.getDate() + 365);
      }

      // Fetch gold prices in PLN/gram from NBP for each chunk
      // NBP returns { data: "YYYY-MM-DD", cena: number } — "data" is Polish for "date"
      const allPrices: { dt: string; cena: number }[] = [];
      for (const chunk of chunks) {
        try {
          const resp = await firstValueFrom(
            this.http.get<{ data: string; cena: number }[]>(
              `https://api.nbp.pl/api/cenyzlota/${chunk.start}/${chunk.end}/?format=json`,
            ),
          );
          for (const entry of resp.data) {
            allPrices.push({ dt: entry.data, cena: entry.cena });
          }
        } catch {
          this.logger.warn(`NBP gold history chunk ${chunk.start}–${chunk.end} failed, skipping`);
        }
      }

      // Group by month, take first price per month
      const byMonth = new Map<string, number>();
      for (const p of allPrices) {
        const monthKey = p.dt.slice(0, 7);
        if (!byMonth.has(monthKey)) byMonth.set(monthKey, p.cena);
      }

      // Convert each monthly PLN/gram price to EUR per unit
      for (const [monthKey, plnPerGram] of byMonth) {
        try {
          const { data: fxData } = await firstValueFrom(
            this.http.get<{ rates: { EUR: number } }>(
              `https://api.frankfurter.app/${monthKey}-01?from=PLN&to=EUR`,
            ),
          );
          const eurPerGram = plnPerGram * fxData.rates.EUR;
          const priceEur = unit === 'g' ? eurPerGram : eurPerGram * GRAMS_PER_TROY_OUNCE;
          results.push({ date: monthKey, priceEur: Math.round(priceEur * 100) / 100 });
        } catch {
          this.logger.warn(`FX conversion failed for ${monthKey}, skipping`);
        }
      }

      this.logger.log(`Gold history: ${results.length} monthly prices fetched`);
    } catch (err) {
      this.logger.error(`Gold price history fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    return results.sort((a, b) => a.date.localeCompare(b.date));
  }
}
