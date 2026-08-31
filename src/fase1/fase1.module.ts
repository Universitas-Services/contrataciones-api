import { Module } from '@nestjs/common';
import { Fase1Service } from './fase1.service';
import { Fase1Controller } from './fase1.controller';
import { EspecificacionesService } from './especificaciones.service';
import { EspecificacionesController } from './especificaciones.controller';
import { RecaudosModeloController } from './recaudos-modelo.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [Fase1Service, EspecificacionesService],
  controllers: [Fase1Controller, EspecificacionesController, RecaudosModeloController],
  exports: [Fase1Service],
})
export class Fase1Module {}
