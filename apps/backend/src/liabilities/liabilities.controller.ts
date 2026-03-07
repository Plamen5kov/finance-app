import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { LiabilitiesService } from './liabilities.service';
import { CreateLiabilityDto } from './dto/create-liability.dto';

@Controller({ path: 'liabilities', version: '1' })
@UseGuards(JwtAuthGuard)
export class LiabilitiesController {
  constructor(private liabilitiesService: LiabilitiesService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.liabilitiesService.findAll(user.householdId);
  }

  @Get('total')
  getTotal(@CurrentUser() user: JwtPayload) {
    return this.liabilitiesService.getTotal(user.householdId);
  }

  @Get('history')
  getHistory(@CurrentUser() user: JwtPayload) {
    return this.liabilitiesService.getHistory(user.householdId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.liabilitiesService.findOne(user.householdId, id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateLiabilityDto) {
    return this.liabilitiesService.create(user.householdId, user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: Partial<CreateLiabilityDto>,
  ) {
    return this.liabilitiesService.update(user.householdId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.liabilitiesService.remove(user.householdId, id);
  }
}
