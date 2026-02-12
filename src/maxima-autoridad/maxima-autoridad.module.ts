import { Module } from '@nestjs/common';
import { MaximaAutoridadService } from './maxima-autoridad.service';
import { MaximaAutoridadController } from './maxima-autoridad.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MaximaAutoridadController],
  providers: [MaximaAutoridadService],
})
export class MaximaAutoridadModule {}
