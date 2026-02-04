import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { PrismaService } from './database/prisma.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configurar servicio de archivos estáticos
  const uploadsPath = join(process.cwd(), 'uploads');

  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
  });

  // Configurar CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades no definidas en DTO
      forbidNonWhitelisted: true, // Lanza error si hay propiedades extra
      transform: true, // Transforma automáticamente tipos
    }),
  );

  // Configurar Prisma shutdown hooks
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  // Configuración de Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Sistema de Contrataciones Públicas - API')
    .setDescription(
      '## 🏛️ API REST para la gestión de contrataciones públicas\n\n' +
      '### 🔐 Roles del Sistema:\n' +
      '- **UNIVERSITAS**: Super administrador del sistema\n' +
      '- **SUPERVISOR**: Supervisa múltiples Entes asignados (solo lectura)\n' +
      '- **ADMIN_ENTE**: Administrador de un Ente Público\n' +
      '- **EJECUTOR**: Usuario operador del Ente\n' +
      '- **VISUALIZADOR**: Usuario de solo lectura\n\n' +
      '### 🚀 Cómo usar:\n' +
      '1. Autenticarse en `/auth/login`\n' +
      '2. Copiar el `access_token` recibido\n' +
      '3. Hacer clic en "Authorize" y pegar el token\n' +
      '4. ¡Listo! Ya puedes usar todos los endpoints\n\n' +
      '### 📚 Documentación completa en GitHub'
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingrese el JWT token recibido al hacer login',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('🔓 Autenticación', 'Endpoints de login y autenticación')
    .addTag('🏛️ Entes', 'Gestión de Entes Públicos')
    .addTag('👨‍💼 Supervisores', 'Gestión de Supervisores (solo UNIVERSITAS)')
    .addTag('📄 Manuales', 'Generación y gestión de manuales DOCX')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'API Docs - Contrataciones',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #1890ff }
    `,
  });

  // Iniciar servidor
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🚀 SISTEMA DE CONTRATACIONES PÚBLICAS - BACKEND');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  ✅ Servidor corriendo en: http://localhost:${port}`);
  console.log(`  ✅ Swagger UI: http://localhost:${port}/api/docs`);
  console.log(`  ✅ Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  ✅ Base de datos: PostgreSQL`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}

bootstrap();
