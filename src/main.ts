import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 1. Helmet : sécurise les headers HTTP
  app.use(helmet());
  
  // 2. CORS strict (adapte selon ton frontend web si besoin)
  app.enableCors({
    origin: true, // En prod, mettre l'URL de ton site web
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 3. Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3002;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 SOTRA GBONHI API running on port ${port}`);
}
bootstrap();
