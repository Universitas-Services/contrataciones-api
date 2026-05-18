import { Module } from '@nestjs/common';
import { ContratoFormalizadoService } from './contrato-formalizado.service';
import { ContratoFormalizadoController } from './contrato-formalizado.controller';

@Module({
  controllers: [ContratoFormalizadoController],
  providers: [ContratoFormalizadoService],
  exports: [ContratoFormalizadoService],
})
export class ContratoFormalizadoModule {}
