import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { HouseholdService } from './household.service';

@Controller({ path: 'household', version: '1' })
export class HouseholdController {
  constructor(private householdService: HouseholdService) {}

  // --- Protected endpoints (require auth) ---

  @Post('invites')
  @UseGuards(JwtAuthGuard)
  createInvite(@CurrentUser() user: JwtPayload) {
    return this.householdService.createInvite(user.userId, user.householdId);
  }

  @Get('invites')
  @UseGuards(JwtAuthGuard)
  listInvites(@CurrentUser() user: JwtPayload) {
    return this.householdService.listInvites(user.userId, user.householdId);
  }

  @Delete('invites/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeInvite(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.householdService.revokeInvite(user.userId, user.householdId, id);
  }

  @Get('members')
  @UseGuards(JwtAuthGuard)
  listMembers(@CurrentUser() user: JwtPayload) {
    return this.householdService.listMembers(user.householdId);
  }

  @Post('invites/:token/accept')
  @UseGuards(JwtAuthGuard)
  acceptInvite(@CurrentUser() user: JwtPayload, @Param('token') token: string) {
    return this.householdService.acceptInvite(token, user.userId, user.email);
  }

  // --- Public endpoint (no auth) ---

  @Get('invites/:token/info')
  getInviteInfo(@Param('token') token: string) {
    return this.householdService.getInviteInfo(token);
  }
}
