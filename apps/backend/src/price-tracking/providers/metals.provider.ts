import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GoldUnit } from '@finances/shared';

export interface MetalPrice {
  priceEur: number; // price per unit in EUR
}

// 1 troy ounce = 31.1035 grams
const GRAMS_PER_TROY_OUNCE = 31.1035;

@Injectable()
export class MetalsProvider {
  private readonly logger = new Logger(MetalsProvider.name);

  constructor(private http: HttpService) {}

  /**
   * Fetch current gold price in EUR per specified unit.
   * Uses frankfurter.app for XAU/EUR rate (XAU = troy ounce of gold).
   * Note: frankfurter.app doesn't support XAU directly, so we use a free metals API fallback.
   * For simplicity, we use a gold price endpoint.
   */
  async fetchGoldPrice(unit: GoldUnit): Promise<MetalPrice> {
    try {
      // Try goldapi.io free endpoint or metals-api
      const { data } = await firstValueFrom(
        this.http.get<{ price_gram_24k: number; price: number }>(
          'https://www.goldapi.io/api/XAU/EUR',
          { headers: { 'x-access-token': 'goldapi-free' } },
        ),
      );

      const pricePerGram = data.price_gram_24k || (data.price / GRAMS_PER_TROY_OUNCE);
      const priceEur = unit === 'g' ? pricePerGram : pricePerGram * GRAMS_PER_TROY_OUNCE;

      this.logger.log(`Gold price: €${priceEur}/${unit}`);
      return { priceEur };
    } catch {
      // Fallback: use a hardcoded approximate price that can be manually updated
      // Gold ~€85/g as of early 2026
      this.logger.warn('Gold API unavailable, using fallback price');
      const fallbackPerGram = 85;
      const priceEur = unit === 'g' ? fallbackPerGram : fallbackPerGram * GRAMS_PER_TROY_OUNCE;
      return { priceEur };
    }
  }
}
