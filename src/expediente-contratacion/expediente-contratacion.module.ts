import { Module } from '@nestjs/common';
import { ExpedienteContratacionController } from './expediente-contratacion.controller';
import { ExpedienteContratacionService } from './expediente-contratacion.service';
import { CronogramaEnteModule } from '../cronograma-ente/cronograma-ente.module';

@Module({
  imports: [CronogramaEnteModule],
  controllers: [ExpedienteContratacionController],
  providers: [ExpedienteContratacionService],
})
export class ExpedienteContratacionModule {}
