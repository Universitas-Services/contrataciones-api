import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { AgenteComplianceClient } from './agente-compliance.client';
import { ComplianceColaService } from './compliance-cola.service';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';

/**
 * Auditoría de expedientes con el agente de compliance externo
 * (docs/API_DICTAMEN_NEST.md). El agente no guarda nada: expedientes,
 * archivos, análisis, dictámenes y conversación viven aquí.
 */
@Module({
  imports: [PrismaModule],
  controllers: [ComplianceController],
  providers: [AgenteComplianceClient, ComplianceService, ComplianceColaService],
})
export class ComplianceModule {}
