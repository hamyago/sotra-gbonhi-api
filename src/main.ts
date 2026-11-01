import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // 🛡️ Sécurité
  app.use(helmet());

  // 🌐 CORS strict (à adapter selon tes domaines)
  app.enableCors({
    origin: [
      'https://admin.sotra.oyop-mt.com',
      'https://sotra.oyop-mt.com',
      'http://localhost:3000',
      'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:8082',
      'http://localhost:3001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // 🧹 Masque les champs @Exclude() (otpHash, etc.)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // ✅ Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 📚 Swagger (visible sur /api/docs)
  const config = new DocumentBuilder()
    .setTitle('SOTRA GBONHI API')
    .setDescription('API de mobilité événementielle — Abidjan')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 SOTRA GBONHI API running on port ${port}`);
  logger.log(`📚 Swagger: http://localhost:${port}/api/docs`);
}
bootstrap();
