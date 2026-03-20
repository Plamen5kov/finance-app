import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import * as Joi from 'joi';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AssetsModule } from './assets/assets.module';
import { LiabilitiesModule } from './liabilities/liabilities.module';
import { NetWorthModule } from './net-worth/net-worth.module';
import { ExpensesModule } from './expenses/expenses.module';
import { GoalsModule } from './goals/goals.module';
import { ImportModule } from './import/import.module';
import { HouseholdModule } from './household/household.module';
import { PriceTrackingModule } from './price-tracking/price-tracking.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { WriteAccessGuard } from './auth/guards/write-access.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().port().default(3001),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRATION: Joi.string().default('7d'),
        FRONTEND_URL: Joi.string().default('http://localhost:3000'),
      }),
      load: [databaseConfig, jwtConfig],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    AssetsModule,
    LiabilitiesModule,
    NetWorthModule,
    ExpensesModule,
    GoalsModule,
    ImportModule,
    HouseholdModule,
    PriceTrackingModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: WriteAccessGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
