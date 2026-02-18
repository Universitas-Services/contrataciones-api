import { Module } from '@nestjs/common';
import { ExpedienteContratacionController } from './expediente-contratacion.controller';
import { ExpedienteContratacionService } from './expediente-contratacion.service';

@Module({
  controllers: [ExpedienteContratacionController],
  providers: [ExpedienteContratacionService],
})
export class ExpedienteContratacionModule {}
