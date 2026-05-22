import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SaveContratoDto } from './dto/save-contrato.dto';
import { UpdateContratoDto } from './dto/update-contrato.dto';
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

  async update(expedienteId: string, dto: UpdateContratoDto, userId: string) {
    const adjudicacion = await this.prisma.adjudicacion.findUnique({
      where: { expedienteId },
      include: {
        expediente: {
          include: { modalidad: true },
        },
      },
    });

    if (!adjudicacion) {
      throw new NotFoundException('Expediente no tiene adjudicación asociada.');
    }

    const contratoActual = await this.prisma.contratoFormalizado.findUnique({
      where: { adjudicacionId: adjudicacion.id },
    });

    if (!contratoActual) {
      throw new NotFoundException('No se ha registrado contrato para este expediente.');
    }

    const data: any = { updatedBy: userId };

    if (dto.fechaInicioVigencia !== undefined)
      data.fechaInicioVigencia = new Date(dto.fechaInicioVigencia);
    if (dto.fechaFinVigencia !== undefined) data.fechaFinVigencia = new Date(dto.fechaFinVigencia);

    if (dto.montoContratoBs !== undefined) {
      data.montoContratoBs = dto.montoContratoBs;
      data.montoContratoBsLetras = toBolivares(dto.montoContratoBs);
      const valorUcauBase = Number(adjudicacion.expediente.modalidad?.valorUcauBase) || 1;
      data.valorUcauContrato = dto.montoContratoBs / valorUcauBase;
    }

    if (dto.plazoEjecucionDias !== undefined) data.plazoEjecucionDias = dto.plazoEjecucionDias;
    if (dto.plazoGarantiaCalidadFuncionamiento !== undefined)
      data.plazoGarantiaCalidadFuncionamiento = dto.plazoGarantiaCalidadFuncionamiento;
    if (dto.nombreSupervisor !== undefined) data.nombreSupervisor = dto.nombreSupervisor;
    if (dto.cedulaSupervisor !== undefined) data.cedulaSupervisor = dto.cedulaSupervisor;
    if (dto.cargoSupervisor !== undefined) data.cargoSupervisor = dto.cargoSupervisor;
    if (dto.criterioAceptacionContrato !== undefined)
      data.criterioAceptacionContrato = dto.criterioAceptacionContrato;
    if (dto.plazoConsignacionFacturas !== undefined)
      data.plazoConsignacionFacturas = dto.plazoConsignacionFacturas;

    if (dto.montoFielCumplimientoBs !== undefined) {
      data.montoFielCumplimientoBs = dto.montoFielCumplimientoBs;
      data.montoFielCumplimientoBsLetras = toBolivares(dto.montoFielCumplimientoBs);
    }

    if (dto.requiereGarantiaLaboral !== undefined)
      data.requiereGarantiaLaboral = dto.requiereGarantiaLaboral;
    if (dto.porcentajeGarantiaLaboral !== undefined)
      data.porcentajeGarantiaLaboral = dto.porcentajeGarantiaLaboral;

    if (dto.montoGarantiaLaboralBs !== undefined) {
      data.montoGarantiaLaboralBs = dto.montoGarantiaLaboralBs;
      data.montoGarantiaLaboralBsLetras = toBolivares(dto.montoGarantiaLaboralBs);
    }

    if (dto.polizaResponsabilidadCivil !== undefined)
      data.polizaResponsabilidadCivil = dto.polizaResponsabilidadCivil;
    if (dto.porcentajeResponsabilidadCivil !== undefined)
      data.porcentajeResponsabilidadCivil = dto.porcentajeResponsabilidadCivil;

    if (dto.montoResponsabilidadCivilBs !== undefined) {
      data.montoResponsabilidadCivilBs = dto.montoResponsabilidadCivilBs;
      data.montoResponsabilidadCivilBsLetras = toBolivares(dto.montoResponsabilidadCivilBs);
    }

    if (dto.anticipoContrato !== undefined) data.anticipoContrato = dto.anticipoContrato;
    if (dto.porcentajeAnticipoOtorgado !== undefined)
      data.porcentajeAnticipoOtorgado = dto.porcentajeAnticipoOtorgado;
    if (dto.formaCumplimientoCrs !== undefined)
      data.formaCumplimientoCrs = dto.formaCumplimientoCrs;
    if (dto.unidadRespCumplimientoCrs !== undefined)
      data.unidadRespCumplimientoCrs = dto.unidadRespCumplimientoCrs;

    if (dto.porcentajeMultaDiaria !== undefined)
      data.porcentajeMultaDiaria = dto.porcentajeMultaDiaria;
    if (dto.baseCalculoMultaDiaria !== undefined)
      data.baseCalculoMultaDiaria = dto.baseCalculoMultaDiaria;
    if (dto.plazoRegularizarIncumplimiento !== undefined)
      data.plazoRegularizarIncumplimiento = dto.plazoRegularizarIncumplimiento;
    if (dto.porcentajeProcedimientoRescision !== undefined)
      data.porcentajeProcedimientoRescision = dto.porcentajeProcedimientoRescision;
    if (dto.formulaAjustePrecios !== undefined)
      data.formulaAjustePrecios = dto.formulaAjustePrecios;
    if (dto.evaluacionDesempeno !== undefined) data.evaluacionDesempeno = dto.evaluacionDesempeno;
    if (dto.garantiaPostEjecucion !== undefined)
      data.garantiaPostEjecucion = dto.garantiaPostEjecucion;
    if (dto.lugarTribunal !== undefined) data.lugarTribunal = dto.lugarTribunal;

    const updated = await this.prisma.contratoFormalizado.update({
      where: { adjudicacionId: adjudicacion.id },
      data,
    });

    return updated;
  }
}
