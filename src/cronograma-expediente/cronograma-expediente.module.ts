import { Module } from '@nestjs/common';
import { CronogramaExpedienteController } from './cronograma-expediente.controller';
import { CronogramaExpedienteService } from './cronograma-expediente.service';

@Module({
  controllers: [CronogramaExpedienteController],
  providers: [CronogramaExpedienteService],
})
export class CronogramaExpedienteModule {}
