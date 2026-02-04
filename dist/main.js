"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const app_module_1 = require("./app.module");
const prisma_service_1 = require("./database/prisma.service");
const swagger_1 = require("@nestjs/swagger");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const uploadsPath = (0, path_1.join)(process.cwd(), 'uploads');
    app.useStaticAssets(uploadsPath, {
        prefix: '/uploads/',
    });
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const prismaService = app.get(prisma_service_1.PrismaService);
    await prismaService.enableShutdownHooks(app);
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Sistema de Contrataciones Públicas - API')
        .setDescription('## 🏛️ API REST para la gestión de contrataciones públicas\n\n' +
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
        '### 📚 Documentación completa en GitHub')
        .setVersion('1.0')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingrese el JWT token recibido al hacer login',
        in: 'header',
    }, 'JWT-auth')
        .addTag('🔓 Autenticación', 'Endpoints de login y autenticación')
        .addTag('🏛️ Entes', 'Gestión de Entes Públicos')
        .addTag('👨‍💼 Supervisores', 'Gestión de Supervisores (solo UNIVERSITAS)')
        .addTag('📄 Manuales', 'Generación y gestión de manuales DOCX')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
        customSiteTitle: 'API Docs - Contrataciones',
        customfavIcon: 'https://nestjs.com/img/logo-small.svg',
        customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #1890ff }
    `,
    });
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
//# sourceMappingURL=main.js.map