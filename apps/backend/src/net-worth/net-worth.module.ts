import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { NetWorthController } from './net-worth.controller';
import { NetWorthService } from './net-worth.service';

@Module({
  imports: [AssetsModule],
  controllers: [NetWorthController],
  providers: [NetWorthService],
})
export class NetWorthModule {}
