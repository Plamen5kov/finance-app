import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PriceTrackingService } from './price-tracking.service';
import { PriceTrackingController } from './price-tracking.controller';
import { YahooFinanceProvider } from './providers/yahoo-finance.provider';
import { CoinGeckoProvider } from './providers/coingecko.provider';
import { MetalsProvider } from './providers/metals.provider';
import { CurrencyProvider } from './providers/currency.provider';

@Module({
  imports: [
    HttpModule.register({ timeout: 15000 }),
    PrismaModule,
  ],
  controllers: [PriceTrackingController],
  providers: [
    PriceTrackingService,
    YahooFinanceProvider,
    CoinGeckoProvider,
    MetalsProvider,
    CurrencyProvider,
  ],
  exports: [PriceTrackingService],
})
export class PriceTrackingModule {}
