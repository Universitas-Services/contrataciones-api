import { Module } from '@nestjs/common';
import { EvaluacionFase3Service } from './evaluacion-fase3.service';
import { EvaluacionFase3Controller } from './evaluacion-fase3.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EvaluacionFase3Controller],
  providers: [EvaluacionFase3Service],
  exports: [EvaluacionFase3Service],
})
export class EvaluacionFase3Module {}
