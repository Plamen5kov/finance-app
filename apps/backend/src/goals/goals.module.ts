import { Module } from '@nestjs/common';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { ExpensesModule } from '../expenses/expenses.module';
import { LiabilitiesModule } from '../liabilities/liabilities.module';

@Module({
  imports: [ExpensesModule, LiabilitiesModule],
  controllers: [GoalsController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
