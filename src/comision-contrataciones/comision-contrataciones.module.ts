import { Module } from '@nestjs/common';
import { ComisionContratacionesService } from './comision-contrataciones.service';
import { ComisionContratacionesController } from './comision-contrataciones.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ComisionContratacionesController],
  providers: [ComisionContratacionesService],
})
export class ComisionContratacionesModule {}
