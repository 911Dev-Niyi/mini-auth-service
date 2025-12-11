import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { json } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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
  // SWAGGER CONFIGURATION
  const config = new DocumentBuilder()
    .setTitle('Secure Wallet Service API')
    .setDescription(
      'Financial Backend Wallet Service with Paystack Integration and API Key/JWT Authentication.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      // For JWT Auth
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'JWT',
    )
    .addApiKey(
      // For API Key Auth
      { type: 'apiKey', name: 'x-api-key', in: 'header' },
      'API Key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // 2. SWAGGER ENDPOINT (The live link for submission will be this URL)
  SwaggerModule.setup('docs', app, document);

  // Enable Validation (for DTOs)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Auto-transform payloads to DTO instances
    }),
  );

  // Enable Serialization (to hide @Exclude() fields like password_hash)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.listen(4000);
}
bootstrap();
