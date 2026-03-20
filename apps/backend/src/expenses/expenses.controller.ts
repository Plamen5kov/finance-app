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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ReassignMerchantDto } from './dto/reassign-merchant.dto';

@Controller({ path: 'expenses', version: '1' })
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('month') month?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.expensesService.findAll(user.householdId, month, categoryId);
  }

  @Get('summary/monthly')
  getMonthlySummary(@CurrentUser() user: JwtPayload, @Query('month') month: string) {
    return this.expensesService.getMonthlySummary(user.householdId, month);
  }

  @Get('report/monthly')
  getMonthlyReport(@CurrentUser() user: JwtPayload, @Query('months') months?: string) {
    let count = 12;
    if (months) {
      const parsed = parseInt(months, 10);
      if (!Number.isNaN(parsed)) count = Math.max(1, Math.min(60, parsed));
    }
    return this.expensesService.getMonthlyReport(user.householdId, count);
  }

  @Get('categories')
  findCategories(@CurrentUser() user: JwtPayload) {
    return this.expensesService.findCategories(user.householdId);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user.householdId, user.userId, dto);
  }

  @Post('categories')
  createCategory(@CurrentUser() user: JwtPayload, @Body() dto: CreateCategoryDto) {
    return this.expensesService.createCategory(user.householdId, user.userId, dto);
  }

  @Patch('merchant/reassign')
  reassignMerchant(@CurrentUser() user: JwtPayload, @Body() dto: ReassignMerchantDto) {
    return this.expensesService.reassignMerchant(
      user.householdId,
      user.userId,
      dto.merchant,
      dto.categoryId,
    );
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: Partial<CreateExpenseDto>,
  ) {
    return this.expensesService.update(user.householdId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.expensesService.remove(user.householdId, id);
  }
}
