// src/main.ts (REQUIRED for Webhooks and Global Setup)

import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { json } from 'express';

async function bootstrap() {
  // Disable default body parse
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Add Raw Body Hook and re-enable JSON parsing
  app.use(
    json({
      limit: '100kb',
      verify: (req: any, res, buf) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        req.rawBody = buf;
      },
    }),
  );

  // Enable Validation (for DTOs)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Auto-transform payloads to DTO instances
    }),
  );

  // Enable Serialization (to hide @Exclude() fields like password_hash)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.listen(3000);
}
bootstrap();
