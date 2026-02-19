import { Module } from '@nestjs/common';
import { ModalidadContratacionController } from './modalidad-contratacion.controller';
import { ModalidadContratacionService } from './modalidad-contratacion.service';

@Module({
  controllers: [ModalidadContratacionController],
  providers: [ModalidadContratacionService],
})
export class ModalidadContratacionModule {}
