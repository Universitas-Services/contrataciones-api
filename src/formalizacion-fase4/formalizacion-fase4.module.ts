import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { FormalizacionFase4Controller } from './formalizacion-fase4.controller';
import { FormalizacionFase4Service } from './formalizacion-fase4.service';
import { DecaimientoService } from './decaimiento.service';

/**
 * Fase 4 de gestión — Formalización.
 *
 * Contratos por oferente adjudicado y ciclos de decaimiento de la
 * adjudicación. Se apoya en el dictamen de la Fase 3 y en el modelo de
 * contrato de la Fase 1; no toca `Adjudicacion` ni `ContratoFormalizado`,
 * que siguen sirviendo al flujo de elaboración.
 */
@Module({
  imports: [PrismaModule],
  controllers: [FormalizacionFase4Controller],
  providers: [FormalizacionFase4Service, DecaimientoService],
  exports: [FormalizacionFase4Service, DecaimientoService],
})
export class FormalizacionFase4Module {}
