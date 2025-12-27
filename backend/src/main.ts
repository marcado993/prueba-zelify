import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('KYC Verification API')
    .setDescription(
      `
## KYC System API

Sistema de verificación de identidad (Know Your Customer) con integración de AWS.

### Flujo de verificación:
1. **POST /kyc/textract** - Sube un documento de identidad (cédula) y extrae los datos usando AWS Textract
2. **POST /kyc/selfieprove** - Sube una selfie y compara con el documento usando AWS Rekognition

### Países soportados:
- 🇪🇨 **EC** - Ecuador (Cédula de Identidad)
- 🇲🇽 **MX** - México (INE/CURP)
- 🇺🇸 **US** - Estados Unidos (Driver License)
- 🇨🇴 **CO** - Colombia (Cédula de Ciudadanía)

### Umbral de aprobación:
La verificación facial requiere un **85% de similitud** para ser aprobada.
    `,
    )
    .setVersion('1.0')
    .addTag('KYC', 'Endpoints de verificación de identidad')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'KYC API Documentation',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #3b82f6 }
    `,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`\n🚀 KYC API running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs available at: http://localhost:${port}/api\n`);
}
bootstrap();
