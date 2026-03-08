import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { PriceTrackingService } from './price-tracking.service';

@Controller({ path: 'price-tracking', version: '1' })
export class PriceTrackingController {
  constructor(private priceTrackingService: PriceTrackingService) {}

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@CurrentUser() user: JwtPayload) {
    return this.priceTrackingService.refreshPrices(user.householdId);
  }
}
