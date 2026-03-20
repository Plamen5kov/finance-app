import { NestFactory } from '@nestjs/core';
import { VersioningType, ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Graceful shutdown — close DB connections, finish in-flight requests
  app.enableShutdownHooks();

  // Security headers
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: [process.env.FRONTEND_URL ?? 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // URI versioning — /v1/goals, /v2/goals, etc.
  app.enableVersioning({ type: VersioningType.URI });

  // Prefix all routes with /api
  app.setGlobalPrefix('api');

  // Global validation — strips unknown fields, auto-transforms types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
    }),
  );

  // Global exception filter — standardised error shape
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global response wrapper — adds success/timestamp/path
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  Logger.log(`Backend running on http://localhost:${port}`, 'Bootstrap');
}
bootstrap();
