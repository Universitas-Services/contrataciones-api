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
import { MaximaAutoridadModule } from './maxima-autoridad/maxima-autoridad.module';
import { UnidadUsuariaModule } from './unidad-usuaria/unidad-usuaria.module';
import { UnidadContratanteModule } from './unidad-contratante/unidad-contratante.module';
import { ComisionContratacionesModule } from './comision-contrataciones/comision-contrataciones.module';
import { ModalidadContratacionModule } from './modalidad-contratacion/modalidad-contratacion.module';
import { ExpedienteContratacionModule } from './expediente-contratacion/expediente-contratacion.module';
import { CronogramaExpedienteModule } from './cronograma-expediente/cronograma-expediente.module';
import { EmailModule } from './email/email.module';

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
    MaximaAutoridadModule,
    UnidadUsuariaModule,
    UnidadContratanteModule,
    ComisionContratacionesModule,
    ModalidadContratacionModule,
    ExpedienteContratacionModule,
    CronogramaExpedienteModule,
    EmailModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
