import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Controller({ path: 'expenses', version: '1' })
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('month') month?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.expensesService.findAll(user.userId, month, categoryId);
  }

  @Get('summary')
  getMonthlySummary(@CurrentUser() user: JwtPayload, @Query('month') month: string) {
    return this.expensesService.getMonthlySummary(user.userId, month);
  }

  @Get('report/monthly')
  getMonthlyReport(@CurrentUser() user: JwtPayload, @Query('months') months?: string) {
    return this.expensesService.getMonthlyReport(user.userId, months ? parseInt(months, 10) : 12);
  }

  @Get('categories')
  findCategories(@CurrentUser() user: JwtPayload) {
    return this.expensesService.findCategories(user.userId);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user.userId, dto);
  }

  @Post('categories')
  createCategory(@CurrentUser() user: JwtPayload, @Body() dto: CreateCategoryDto) {
    return this.expensesService.createCategory(user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: Partial<CreateExpenseDto>,
  ) {
    return this.expensesService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.expensesService.remove(user.userId, id);
  }
}
