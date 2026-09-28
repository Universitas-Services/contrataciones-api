import { Module } from '@nestjs/common';
import { EvaluacionFase3Service } from './evaluacion-fase3.service';
import { EvaluacionFase3Controller } from './evaluacion-fase3.controller';
import { HubController } from './hub/hub.controller';
import { HubService } from './hub/hub.service';
import { SnapshotService } from './hub/snapshot.service';
import { ScoringService } from './hub/scoring.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EvaluacionFase3Controller, HubController],
  providers: [EvaluacionFase3Service, HubService, SnapshotService, ScoringService],
  exports: [EvaluacionFase3Service, HubService],
})
export class EvaluacionFase3Module {}
