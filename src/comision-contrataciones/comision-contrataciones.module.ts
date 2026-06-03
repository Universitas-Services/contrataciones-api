import { Module } from '@nestjs/common';
import { ComisionContratacionesService } from './comision-contrataciones.service';
import { ComisionContratacionesController } from './comision-contrataciones.controller';
import { PrismaModule } from '../database/prisma.module';
import { ManualesModule } from '../manuales/manuales.module';

@Module({
  imports: [PrismaModule, ManualesModule],
  controllers: [ComisionContratacionesController],
  providers: [ComisionContratacionesService],
})
export class ComisionContratacionesModule {}
