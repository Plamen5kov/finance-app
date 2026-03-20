import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto, UpdateGoalStatusDto } from './dto/update-goal.dto';
import { RecordProgressDto } from './dto/record-progress.dto';

@Controller({ path: 'goals', version: '1' })
export class GoalsController {
  constructor(private goalsService: GoalsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('recurringPeriod') recurringPeriod?: string) {
    return this.goalsService.findAll(user.householdId, recurringPeriod);
  }

  @Get('summary')
  getSummary(@CurrentUser() user: JwtPayload) {
    return this.goalsService.getSummary(user.householdId);
  }

  @Get('history')
  getHistory(@CurrentUser() user: JwtPayload) {
    return this.goalsService.getHistory(user.householdId);
  }

  @Get('emergency-fund/advice')
  getEmergencyFundAdvice(@CurrentUser() user: JwtPayload) {
    return this.goalsService.getEmergencyFundAdvice(user.householdId);
  }

  @Get('budget-advice')
  getBudgetAdvice(@CurrentUser() user: JwtPayload) {
    return this.goalsService.getBudgetAdvice(user.householdId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.goalsService.findOne(user.householdId, id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(user.householdId, user.userId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.goalsService.update(user.householdId, id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateGoalStatusDto,
  ) {
    return this.goalsService.updateStatus(user.householdId, id, dto);
  }

  @Post(':id/progress')
  recordProgress(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RecordProgressDto,
  ) {
    return this.goalsService.recordProgress(user.householdId, id, dto);
  }

  @Get(':id/progress')
  getProgress(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.goalsService.getProgress(user.householdId, id);
  }

  @Delete(':id/progress/:snapshotId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProgress(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('snapshotId') snapshotId: string,
  ) {
    return this.goalsService.deleteProgress(user.householdId, id, snapshotId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.goalsService.remove(user.householdId, id);
  }
}
