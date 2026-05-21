import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SaveContratoDto } from './dto/save-contrato.dto';
import { EstatusProceso } from '@prisma/client';
import { NumerosALetras } from 'numero-a-letras';

function toBolivares(monto: number | undefined | null): string | null {
  if (monto === undefined || monto === null) return null;
  const textoOriginal = NumerosALetras(monto);
  return textoOriginal
    .replace('Pesos', 'Bolívares')
    .replace('Peso', 'Bolívar')
    .replace('M.N.', '')
    .trim()
    .toUpperCase();
}

@Injectable()
export class ContratoFormalizadoService {
  constructor(private prisma: PrismaService) {}

  async create(expedienteId: string, dto: SaveContratoDto, userId: string) {
    const adjudicacion = await this.prisma.adjudicacion.findUnique({
      where: { expedienteId },
      include: {
        expediente: {
          include: { modalidad: true },
        },
      },
    });

    if (!adjudicacion) {
      throw new BadRequestException(
        'No existe una adjudicación para este expediente. Debe completar la adjudicación primero.',
      );
    }

    if (adjudicacion.expediente.estatusProceso !== EstatusProceso.ADJUDICADO) {
      throw new BadRequestException('El expediente no se encuentra en estado ADJUDICADO.');
    }

    const valorUcauBase = Number(adjudicacion.expediente.modalidad.valorUcauBase) || 1;
    const valorUcauContrato = dto.montoContratoBs / valorUcauBase;

    const numeroContratoFisico = `CONT-${adjudicacion.expediente.codigoNomenclatura || adjudicacion.expedienteId.substring(0, 8)}`;

    const resultado = await this.prisma.$transaction(async (prisma) => {
      const contrato = await prisma.contratoFormalizado.create({
        data: {
          adjudicacionId: adjudicacion.id,
          numeroContratoFisico,
          fechaFirmaContrato: new Date(),
          fechaInicioVigencia: new Date(dto.fechaInicioVigencia),
          fechaFinVigencia: new Date(dto.fechaFinVigencia),
          montoContratoBs: dto.montoContratoBs,
          montoContratoBsLetras: toBolivares(dto.montoContratoBs),
          valorUcauContrato,
          plazoEjecucionDias: dto.plazoEjecucionDias,
          plazoGarantiaCalidadFuncionamiento: dto.plazoGarantiaCalidadFuncionamiento,

          nombreSupervisor: dto.nombreSupervisor,
          cedulaSupervisor: dto.cedulaSupervisor,
          cargoSupervisor: dto.cargoSupervisor,
          criterioAceptacionContrato: dto.criterioAceptacionContrato,
          plazoConsignacionFacturas: dto.plazoConsignacionFacturas,

          montoFielCumplimientoBs: dto.montoFielCumplimientoBs,
          montoFielCumplimientoBsLetras: toBolivares(dto.montoFielCumplimientoBs),
          requiereGarantiaLaboral: dto.requiereGarantiaLaboral,
          porcentajeGarantiaLaboral: dto.porcentajeGarantiaLaboral,
          montoGarantiaLaboralBs: dto.montoGarantiaLaboralBs,
          montoGarantiaLaboralBsLetras: toBolivares(dto.montoGarantiaLaboralBs),
          polizaResponsabilidadCivil: dto.polizaResponsabilidadCivil,
          porcentajeResponsabilidadCivil: dto.porcentajeResponsabilidadCivil,
          montoResponsabilidadCivilBs: dto.montoResponsabilidadCivilBs,
          montoResponsabilidadCivilBsLetras: toBolivares(dto.montoResponsabilidadCivilBs),
          anticipoContrato: dto.anticipoContrato,
          porcentajeAnticipoOtorgado: dto.porcentajeAnticipoOtorgado,
          formaCumplimientoCrs: dto.formaCumplimientoCrs,
          unidadRespCumplimientoCrs: dto.unidadRespCumplimientoCrs,

          porcentajeMultaDiaria: dto.porcentajeMultaDiaria,
          baseCalculoMultaDiaria: dto.baseCalculoMultaDiaria,
          plazoRegularizarIncumplimiento: dto.plazoRegularizarIncumplimiento,
          porcentajeProcedimientoRescision: dto.porcentajeProcedimientoRescision,
          formulaAjustePrecios: dto.formulaAjustePrecios,
          evaluacionDesempeno: dto.evaluacionDesempeno,
          garantiaPostEjecucion: dto.garantiaPostEjecucion,
          lugarTribunal: dto.lugarTribunal,

          createdBy: userId,
          updatedBy: userId,
        },
      });

      await prisma.expedienteContratacion.update({
        where: { id: expedienteId },
        data: {
          estatusProceso: EstatusProceso.CONTRATADO,
          updatedBy: userId,
        },
      });

      return contrato;
    });

    return resultado;
  }

  async findByExpediente(expedienteId: string) {
    const adjudicacion = await this.prisma.adjudicacion.findUnique({
      where: { expedienteId },
    });

    if (!adjudicacion) {
      throw new NotFoundException('Expediente no tiene adjudicación asociada.');
    }

    const contrato = await this.prisma.contratoFormalizado.findUnique({
      where: { adjudicacionId: adjudicacion.id },
    });

    if (!contrato) {
      throw new NotFoundException('No se ha registrado contrato para este expediente.');
    }

    return contrato;
  }
}
