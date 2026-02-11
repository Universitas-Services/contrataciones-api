import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EntesModule } from './entes/entes.module';
import { StorageModule } from './storage/storage.module';
import { ManualesModule } from './manuales/manuales.module';
import { SupervisoresModule } from './supervisores/supervisores.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { ProveedoresModule } from './proveedores/proveedores.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    StorageModule,
    AuthModule,
    EntesModule,
    ManualesModule,
    SupervisoresModule,
    ProveedoresModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
