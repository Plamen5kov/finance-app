import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { NetWorthService } from './net-worth.service';

@Controller({ path: 'net-worth', version: '1' })
@UseGuards(JwtAuthGuard)
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
