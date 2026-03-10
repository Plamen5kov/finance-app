import { Module } from '@nestjs/common';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { ExpensesModule } from '../expenses/expenses.module';

@Module({
  imports: [ExpensesModule],
  controllers: [GoalsController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
