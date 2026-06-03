import { Module } from '@nestjs/common';
import { MaximaAutoridadService } from './maxima-autoridad.service';
import { MaximaAutoridadController } from './maxima-autoridad.controller';
import { PrismaModule } from '../database/prisma.module';
import { ManualesModule } from '../manuales/manuales.module';

@Module({
  imports: [PrismaModule, ManualesModule],
  controllers: [MaximaAutoridadController],
  providers: [MaximaAutoridadService],
})
export class MaximaAutoridadModule {}
