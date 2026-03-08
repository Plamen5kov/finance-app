import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { HouseholdService } from './household.service';

@Controller({ path: 'household', version: '1' })
export class HouseholdController {
  constructor(private householdService: HouseholdService) {}

  @Post('invites')
  createInvite(@CurrentUser() user: JwtPayload, @Body('role') role?: string) {
    return this.householdService.createInvite(user.userId, user.householdId, role);
  }

  @Get('invites')
  listInvites(@CurrentUser() user: JwtPayload) {
    return this.householdService.listInvites(user.userId, user.householdId);
  }

  @Delete('invites/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeInvite(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.householdService.revokeInvite(user.userId, user.householdId, id);
  }

  @Get('members')
  listMembers(@CurrentUser() user: JwtPayload) {
    return this.householdService.listMembers(user.householdId);
  }

  @Delete('members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('memberId') memberId: string,
  ) {
    return this.householdService.removeMember(user.userId, user.householdId, memberId);
  }

  @Patch('members/:memberId/role')
  updateMemberRole(
    @CurrentUser() user: JwtPayload,
    @Param('memberId') memberId: string,
    @Body('role') role: string,
  ) {
    return this.householdService.updateMemberRole(user.userId, user.householdId, memberId, role);
  }

  @Post('invites/:token/accept')
  acceptInvite(@CurrentUser() user: JwtPayload, @Param('token') token: string) {
    return this.householdService.acceptInvite(token, user.userId, user.email);
  }

  @Public()
  @Get('invites/:token/info')
  getInviteInfo(@Param('token') token: string) {
    return this.householdService.getInviteInfo(token);
  }
}
