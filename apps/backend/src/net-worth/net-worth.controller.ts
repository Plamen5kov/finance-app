import { Controller, Get } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { NetWorthService } from './net-worth.service';

@Controller({ path: 'net-worth', version: '1' })
export class NetWorthController {
  constructor(private netWorthService: NetWorthService) {}

  @Get()
  getSummary(@CurrentUser() user: JwtPayload) {
    return this.netWorthService.getSummary(user.householdId);
  }

  @Get('history')
  getHistory(@CurrentUser() user: JwtPayload) {
    return this.netWorthService.getHistory(user.householdId);
  }

  @Get('projection')
  getProjection(@CurrentUser() user: JwtPayload) {
    return this.netWorthService.getProjection(user.householdId);
  }
}
