import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProcesoCompletoDto } from './dto/create-proceso-completo.dto';
import { CalcularModalidadDto } from './dto/calcular-modalidad.dto';
import { CreateExpedienteDraftDto } from './dto/create-expediente-draft.dto';
import { UpdateExpedienteGeneralDto } from './dto/update-expediente-general.dto';
import { QueryExpedienteDto } from './dto/query-expedientes.dto';
import { GenerarCronogramaDto } from './dto/generar-cronograma.dto';
import { UpdateCronogramaExpedienteDto } from './dto/update-cronograma.dto';
import { ModalidadSeleccion, RolUsuario, Prisma } from '@prisma/client';
import { BusinessDaysUtil } from '../common/utils/business-days.util';
@Injectable()
export class ExpedienteContratacionService {
  constructor(private readonly prisma: PrismaService) {}

  async createFullProcess(dto: CreateProcesoCompletoDto, userId: string, enteId: string) {
    if (!enteId) {
      throw new BadRequestException(
        'El usuario no tiene un Ente asignado para realizar esta acción.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Crear Modalidad
        const modalidad = await tx.modalidadContratacion.create({
          data: {
            ...dto.modalidad,
            enteId: enteId,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        // 2. Crear Expediente
        const expediente = await tx.expedienteContratacion.create({
          data: {
            ...dto.expediente,
            enteId: enteId,
            modalidadId: modalidad.id,
            estatusProceso: 'BORRADOR',
            createdBy: userId,
            updatedBy: userId,
          },
        });

        // 3. Crear Cronograma
        const cronograma = await tx.cronogramaExpediente.create({
          data: {
            ...dto.cronograma,
            expedienteId: expediente.id,
            createdBy: userId,
            updatedBy: userId,
            // Convertir strings de fechas a Date objects si es necesario,
            // pero si el DTO usa @Type(() => Date) o class-transformer se maneja solo.
            // En mi DTO usé @IsDateString(), lo cual mantiene string.
            // Prisma necesita objetos Date. Debo parsearlos.
            fechaLlamadoParticipar: dto.cronograma.fechaLlamadoParticipar
              ? new Date(dto.cronograma.fechaLlamadoParticipar)
              : null,
            fechaInicioDisponibilidadPliego: dto.cronograma.fechaInicioDisponibilidadPliego
              ? new Date(dto.cronograma.fechaInicioDisponibilidadPliego)
              : null,
            fechaFinDisponibilidadPliego: dto.cronograma.fechaFinDisponibilidadPliego
              ? new Date(dto.cronograma.fechaFinDisponibilidadPliego)
              : null,
            fechaSolicitudAclaratorias: dto.cronograma.fechaSolicitudAclaratorias
              ? new Date(dto.cronograma.fechaSolicitudAclaratorias)
              : null,
            fechaRespuestaAclaratorias: dto.cronograma.fechaRespuestaAclaratorias
              ? new Date(dto.cronograma.fechaRespuestaAclaratorias)
              : null,
            fechaModificacionPliego: dto.cronograma.fechaModificacionPliego
              ? new Date(dto.cronograma.fechaModificacionPliego)
              : null,
            fechaActoRecepcionAperturaSobres: dto.cronograma.fechaActoRecepcionAperturaSobres
              ? new Date(dto.cronograma.fechaActoRecepcionAperturaSobres)
              : null,
            fechaLimiteEvaluacion: dto.cronograma.fechaLimiteEvaluacion
              ? new Date(dto.cronograma.fechaLimiteEvaluacion)
              : null,
            fechaLimiteAdjudicacion: dto.cronograma.fechaLimiteAdjudicacion
              ? new Date(dto.cronograma.fechaLimiteAdjudicacion)
              : null,
            fechaLimiteNotificacion: dto.cronograma.fechaLimiteNotificacion
              ? new Date(dto.cronograma.fechaLimiteNotificacion)
              : null,
            fechaLimiteGarantias: dto.cronograma.fechaLimiteGarantias
              ? new Date(dto.cronograma.fechaLimiteGarantias)
              : null,
            fechaLimiteFirmaContrato: dto.cronograma.fechaLimiteFirmaContrato
              ? new Date(dto.cronograma.fechaLimiteFirmaContrato)
              : null,
          },
        });

        return {
          message: 'Proceso de contratación creado exitosamente',
          data: {
            modalidad,
            expediente,
            cronograma,
          },
        };
      });
    } catch (error: unknown) {
      console.error(error);

      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException('Error al crear el proceso de contratación: ' + msg);
    }
  }

  // --- NUEVA LÓGICA DE CÁLCULO DE MODALIDAD (PASO 2) ---

  calcularModalidadSugerida(dto: CalcularModalidadDto) {
    // NOTA: Este valor UCAU debe venir de una configuración global en el futuro.
    // Usamos un valor fijo de referencia para el MVP.
    const VALOR_UCAU_ACTUAL = 35.0; // Bs.

    const montoUcau = Number(dto.montoEstimadoBs) / VALOR_UCAU_ACTUAL;

    let modalidadSugerida: ModalidadSeleccion;
    let baseLegal = '';
    let nombreModalidad = '';

    // Lógica basada en rangos legales de la Ley de Contrataciones Públicas (DLCP)
    switch (dto.tipoContratacion) {
      case 'BIENES':
        if (montoUcau > 20000) {
          modalidadSugerida = 'LICITACION_PUBLICA'; // Equivalente en el Enum a Concurso Abierto
          nombreModalidad = 'Concurso Abierto, acto único, apertura única';
          baseLegal = 'Artículo 78, Numeral 1, DLCP';
        } else if (montoUcau > 5000) {
          modalidadSugerida = 'CONCURSO_CERRADO';
          nombreModalidad = 'Concurso Cerrado';
          baseLegal = 'Artículo 85, Numeral 1, DLCP';
        } else {
          modalidadSugerida = 'CONSULTA_PRECIOS';
          nombreModalidad = 'Consulta de Precios';
          baseLegal = 'Artículo 95, Numeral 1, DLCP';
        }
        break;

      case 'SERVICIOS':
        if (montoUcau > 30000) {
          modalidadSugerida = 'LICITACION_PUBLICA';
          nombreModalidad = 'Concurso Abierto, acto único, apertura única';
          baseLegal = 'Artículo 78, Numeral 2, DLCP';
        } else if (montoUcau > 10000) {
          modalidadSugerida = 'CONCURSO_CERRADO';
          nombreModalidad = 'Concurso Cerrado';
          baseLegal = 'Artículo 85, Numeral 2, DLCP';
        } else {
          modalidadSugerida = 'CONSULTA_PRECIOS';
          nombreModalidad = 'Consulta de Precios';
          baseLegal = 'Artículo 95, Numeral 2, DLCP';
        }
        break;

      case 'OBRAS':
        if (montoUcau > 50000) {
          modalidadSugerida = 'LICITACION_PUBLICA';
          nombreModalidad = 'Concurso Abierto, acto único, apertura única';
          baseLegal = 'Artículo 78, Numeral 3, DLCP';
        } else if (montoUcau > 20000) {
          modalidadSugerida = 'CONCURSO_CERRADO';
          nombreModalidad = 'Concurso Cerrado';
          baseLegal = 'Artículo 85, Numeral 3, DLCP';
        } else {
          modalidadSugerida = 'CONSULTA_PRECIOS';
          nombreModalidad = 'Consulta de Precios';
          baseLegal = 'Artículo 95, Numeral 3, DLCP';
        }
        break;

      case 'MIXTO':
        // Generalizando para mixto basado en obras como peor escenario o bienes
        modalidadSugerida = montoUcau > 50000 ? 'LICITACION_PUBLICA' : 'CONSULTA_PRECIOS';
        nombreModalidad =
          modalidadSugerida === 'LICITACION_PUBLICA' ? 'Concurso Abierto' : 'Consulta de Precios';
        baseLegal = 'Artículo 78, Numeral 4, DLCP (Referencial Mixto)';
        break;

      default:
        modalidadSugerida = 'ADJUDICACION_DIRECTA';
        nombreModalidad = 'Adjudicación Directa';
        baseLegal = 'Artículo 101, DLCP';
        break;
    }

    return {
      tipoContratacion: dto.tipoContratacion,
      valorUcauBase: VALOR_UCAU_ACTUAL,
      montoEstimadoBs: Number(dto.montoEstimadoBs),
      montoUcauCalculado: Number(montoUcau.toFixed(2)),
      modalidadSeleccion: modalidadSugerida,
      nombreModalidadSugerida: nombreModalidad,
      baseLegal: baseLegal,
    };
  }

  // --- CREAR BORRADOR (PASO 2 COMPLETADO) ---
  async createBorrador(dto: CreateExpedienteDraftDto, userId: string, enteId: string) {
    if (!enteId) {
      throw new BadRequestException(
        'El usuario no tiene un Ente asignado para realizar esta acción.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Crear Modalidad
        const modalidad = await tx.modalidadContratacion.create({
          data: {
            tipoContratacion: dto.tipoContratacion,
            montoEstimadoBs: dto.montoEstimadoBs,
            montoEstimadoDolar: dto.montoEstimadoDolar,
            valorUcauBase: dto.valorUcauBase,
            modalidadSeleccion: dto.modalidadSeleccion,
            enteId: enteId,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        // 2. Crear Expediente (Borrador sin actores)
        const expediente = await tx.expedienteContratacion.create({
          data: {
            descripcionObjeto: dto.descripcionObjeto,
            codigoNomenclatura: dto.codigoNomenclatura,
            enteId: enteId,
            modalidadId: modalidad.id,
            estatusProceso: 'BORRADOR',
            createdBy: userId,
            updatedBy: userId,
          },
        });

        return {
          message: 'Expediente creado en borrador exitosamente',
          data: {
            modalidad,
            expediente,
          },
        };
      });
    } catch (error: unknown) {
      console.error(error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException('Error al crear el borrador: ' + msg);
    }
  }

  // --- EDICIÓN GENERAL (Múltiples Campos y Autocálculo de Cronograma) ---
  async updateGeneral(id: string, dto: UpdateExpedienteGeneralDto, userId: string, enteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id },
      include: {
        modalidad: true,
        cronograma: true,
      },
    });

    if (!expediente) throw new NotFoundException('El expediente no existe');
    if (expediente.enteId !== enteId)
      throw new BadRequestException('No tiene permisos para modificar este expediente');
    if (expediente.estatusProceso === 'ANULADO')
      throw new BadRequestException('No se puede editar un expediente anulado');

    try {
      return await this.prisma.$transaction(async (tx) => {
        // --- 1. DATOS DE MODALIDAD ---
        const dataModalidad: Prisma.ModalidadContratacionUpdateInput = {};
        if (dto.tipoContratacion !== undefined)
          dataModalidad.tipoContratacion = dto.tipoContratacion;
        if (dto.montoEstimadoBs !== undefined) dataModalidad.montoEstimadoBs = dto.montoEstimadoBs;
        if (dto.montoEstimadoDolar !== undefined)
          dataModalidad.montoEstimadoDolar = dto.montoEstimadoDolar;
        if (dto.valorUcauBase !== undefined) dataModalidad.valorUcauBase = dto.valorUcauBase;
        if (dto.modalidadSeleccion !== undefined)
          dataModalidad.modalidadSeleccion = dto.modalidadSeleccion;

        let modalidadInfo = expediente.modalidad;
        if (Object.keys(dataModalidad).length > 0 && expediente.modalidadId) {
          dataModalidad.updatedBy = userId;
          modalidadInfo = await tx.modalidadContratacion.update({
            where: { id: expediente.modalidadId },
            data: dataModalidad,
          });
        }

        // --- 2. DATOS DEL EXPEDIENTE (Básicos + Actores) ---
        const dataExpediente: Prisma.ExpedienteContratacionUncheckedUpdateInput = {};
        if (dto.descripcionObjeto !== undefined)
          dataExpediente.descripcionObjeto = dto.descripcionObjeto;
        if (dto.codigoNomenclatura !== undefined)
          dataExpediente.codigoNomenclatura = dto.codigoNomenclatura;
        if (dto.autoridadId !== undefined) dataExpediente.autoridadId = dto.autoridadId;
        if (dto.comisionId !== undefined) dataExpediente.comisionId = dto.comisionId;
        if (dto.unidadUsuariaId !== undefined) dataExpediente.unidadUsuariaId = dto.unidadUsuariaId;
        if (dto.autoridadFirmaComoDelegado !== undefined)
          dataExpediente.autoridadFirmaComoDelegado = dto.autoridadFirmaComoDelegado;

        let resultExpediente: any = expediente;
        if (Object.keys(dataExpediente).length > 0) {
          dataExpediente.updatedBy = userId;
          resultExpediente = await tx.expedienteContratacion.update({
            where: { id },
            data: dataExpediente,
          });
        }

        // --- 3. CRONOGRAMA (Si envían fecha o si cambió el tipoContratacion y ya había cronograma) ---
        let resultCronograma = expediente.cronograma;
        const triggerCronograma =
          !!dto.fechaLlamadoParticipar || (!!dto.tipoContratacion && !!expediente.cronograma);

        if (triggerCronograma && modalidadInfo) {
          const baseDate = dto.fechaLlamadoParticipar
            ? dto.fechaLlamadoParticipar
            : expediente.cronograma?.fechaLlamadoParticipar
              ? expediente.cronograma.fechaLlamadoParticipar.toISOString().split('T')[0]
              : null;

          if (baseDate) {
            const calculo = this.generarCronogramaLegal({
              tipoContratacion: modalidadInfo.tipoContratacion,
              fechaLlamadoParticipar: baseDate,
            });

            const f = calculo.data;
            const cronogramaData = {
              fechaLlamadoParticipar: new Date(f.fechaLlamadoParticipar + 'T00:00:00Z'),
              fechaInicioDisponibilidadPliego: new Date(
                f.fechaInicioDisponibilidadPliego + 'T00:00:00Z',
              ),
              fechaFinDisponibilidadPliego: new Date(f.fechaFinDisponibilidadPliego + 'T00:00:00Z'),
              fechaSolicitudAclaratorias: new Date(f.fechaSolicitudAclaratorias + 'T00:00:00Z'),
              fechaRespuestaAclaratorias: new Date(f.fechaRespuestaAclaratorias + 'T00:00:00Z'),
              fechaModificacionPliego: new Date(f.fechaModificacionPliego + 'T00:00:00Z'),
              fechaActoRecepcionAperturaSobres: new Date(
                f.fechaActoRecepcionAperturaSobres + 'T00:00:00Z',
              ),
              fechaLimiteEvaluacion: new Date(f.fechaLimiteEvaluacion + 'T00:00:00Z'),
              fechaLimiteAdjudicacion: new Date(f.fechaLimiteAdjudicacion + 'T00:00:00Z'),
              fechaLimiteNotificacion: new Date(f.fechaLimiteNotificacion + 'T00:00:00Z'),
              fechaLimiteGarantias: new Date(f.fechaLimiteGarantias + 'T00:00:00Z'),
              fechaLimiteFirmaContrato: new Date(f.fechaLimiteFirmaContrato + 'T00:00:00Z'),
              updatedBy: userId,
            };

            if (expediente.cronograma) {
              resultCronograma = await tx.cronogramaExpediente.update({
                where: { id: expediente.cronograma.id },
                data: cronogramaData,
              });
            } else {
              resultCronograma = await tx.cronogramaExpediente.create({
                data: { ...cronogramaData, expedienteId: id, createdBy: userId },
              });
            }
          }
        }

        return {
          message: 'Expediente actualizado exitosamente',
          data: {
            expediente: resultExpediente,
            modalidad: modalidadInfo,
            cronograma: resultCronograma,
          },
        };
      });
    } catch (error: unknown) {
      console.error(error);
      throw new InternalServerErrorException(
        'Error al actualizar expediente: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  // --- LISTADO DE EXPEDIENTES ---
  async findAll(query: QueryExpedienteDto, enteId: string, rol: RolUsuario) {
    const { page = 1, limit = 10, search, estatus, tipo } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpedienteContratacionWhereInput = {};

    // Filtro por Ente (a menos que sea UNIVERSITAS)
    if (rol !== 'UNIVERSITAS' && enteId) {
      where.enteId = enteId;
    }

    // Filtro por Estatus
    if (estatus) {
      where.estatusProceso = estatus;
    }

    // Filtro por Tipo de Contratación (atraviesa relación Modalidad)
    if (tipo) {
      where.modalidad = {
        tipoContratacion: tipo,
      };
    }

    // Búsqueda por nomenclatura o descripción
    if (search) {
      where.OR = [
        { codigoNomenclatura: { contains: search, mode: 'insensitive' } },
        { descripcionObjeto: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const [data, total] = await Promise.all([
        this.prisma.expedienteContratacion.findMany({
          where,
          include: {
            modalidad: true,
            comision: true,
            unidadUsuaria: true,
            autoridad: true,
            cronograma: true,
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.expedienteContratacion.count({ where }),
      ]);

      return {
        message: 'Expedientes obtenidos exitosamente',
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: unknown) {
      console.error(error);
      throw new InternalServerErrorException('Error al obtener los expedientes');
    }
  }

  // --- OBTENER POR ID ---
  async findOne(id: string, enteId: string, rol: RolUsuario) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id },
      include: {
        modalidad: true,
        comision: { include: { miembros: true } },
        unidadUsuaria: true,
        autoridad: true,
        cronograma: true,
      },
    });

    if (!expediente) throw new NotFoundException('Expediente no encontrado');
    if (rol !== 'UNIVERSITAS' && expediente.enteId !== enteId) {
      throw new BadRequestException('No tiene permisos para ver este expediente');
    }

    return { message: 'Expediente obtenido exitosamente', data: expediente };
  }

  // --- ANULAR / ELIMINAR EXPEDIENTE ---
  async remove(id: string, userId: string, enteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id },
    });

    if (!expediente) throw new NotFoundException('Expediente no encontrado');
    if (expediente.enteId !== enteId) throw new BadRequestException('Sin permisos');

    try {
      const result = await this.prisma.expedienteContratacion.update({
        where: { id },
        data: {
          estatusProceso: 'ANULADO',
          deletedAt: new Date(),
          updatedBy: userId,
        },
      });

      return {
        message: 'Expediente anulado exitosamente',
        data: result,
      };
    } catch (e: unknown) {
      throw new InternalServerErrorException(
        'Error al anular expediente: ' + (e instanceof Error ? e.message : String(e)),
      );
    }
  }

  // --- GENERACIÓN DE CRONOGRAMA AUTOMÁTICO (PASO 4) ---
  generarCronogramaLegal(dto: GenerarCronogramaDto) {
    const fechaLlamado = new Date(dto.fechaLlamadoParticipar + 'T00:00:00Z'); // Evitar timezone shifts

    let diasFinPliego = 0;
    const diasSolicitarAclaratoria = 3;
    let diasActoRecepcion = 0;
    let diasEvaluacion = 0;
    let diasAdjudicacion = 0;

    switch (dto.tipoContratacion) {
      case 'BIENES':
        diasFinPliego = 6;
        diasActoRecepcion = 7;
        diasEvaluacion = 5;
        diasAdjudicacion = 9;
        break;
      case 'SERVICIOS':
        diasFinPliego = 8;
        diasActoRecepcion = 9;
        diasEvaluacion = 7;
        diasAdjudicacion = 12;
        break;
      case 'OBRAS':
      case 'MIXTO':
        diasFinPliego = 10;
        diasActoRecepcion = 11;
        diasEvaluacion = 10;
        diasAdjudicacion = 16;
        break;
    }

    // Cálculos a partir de fechaLlamado
    const inicioDispPliego = fechaLlamado;
    const finDispPliego = BusinessDaysUtil.addBusinessDays(fechaLlamado, diasFinPliego);
    const limiteSolicitudAclaratorias = BusinessDaysUtil.addBusinessDays(
      fechaLlamado,
      diasSolicitarAclaratoria,
    );
    const actoRecepcion = BusinessDaysUtil.addBusinessDays(fechaLlamado, diasActoRecepcion);

    // Cálculos regresivos desde el Acto de Recepción
    const limiteRespuestaAclaratorias = BusinessDaysUtil.subtractBusinessDays(actoRecepcion, 1);
    const limiteModificacionesPliego = BusinessDaysUtil.subtractBusinessDays(actoRecepcion, 2);

    // Cálculos progresivos desde el Acto de Recepción
    const limiteEvaluacion = BusinessDaysUtil.addBusinessDays(actoRecepcion, diasEvaluacion);
    const limiteAdjudicacion = BusinessDaysUtil.addBusinessDays(actoRecepcion, diasAdjudicacion);

    // Cálculos finales (Notificación, Garantías, Firma)
    const limiteNotificacion = BusinessDaysUtil.addBusinessDays(limiteAdjudicacion, 2);
    const limiteGarantias = BusinessDaysUtil.addBusinessDays(limiteNotificacion, 5);
    const limiteFirmaContrato = BusinessDaysUtil.addBusinessDays(limiteNotificacion, 8);

    return {
      message: 'Cronograma calculado exitosamente basándose en la DLCP',
      data: {
        fechaLlamadoParticipar: fechaLlamado.toISOString().split('T')[0],
        fechaInicioDisponibilidadPliego: inicioDispPliego.toISOString().split('T')[0],
        fechaFinDisponibilidadPliego: finDispPliego.toISOString().split('T')[0],
        fechaSolicitudAclaratorias: limiteSolicitudAclaratorias.toISOString().split('T')[0],
        fechaModificacionPliego: limiteModificacionesPliego.toISOString().split('T')[0],
        fechaRespuestaAclaratorias: limiteRespuestaAclaratorias.toISOString().split('T')[0],
        fechaActoRecepcionAperturaSobres: actoRecepcion.toISOString().split('T')[0],
        fechaLimiteEvaluacion: limiteEvaluacion.toISOString().split('T')[0],
        fechaLimiteAdjudicacion: limiteAdjudicacion.toISOString().split('T')[0],
        fechaLimiteNotificacion: limiteNotificacion.toISOString().split('T')[0],
        fechaLimiteGarantias: limiteGarantias.toISOString().split('T')[0],
        fechaLimiteFirmaContrato: limiteFirmaContrato.toISOString().split('T')[0],
      },
    };
  }

  // --- GUARDAR CRONOGRAMA Y FINALIZAR WIZARD (PASO 4) ---
  async updateCronograma(
    id: string,
    dto: UpdateCronogramaExpedienteDto,
    userId: string,
    enteId: string,
  ) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id },
      include: {
        modalidad: true,
        cronograma: true,
      },
    });

    if (!expediente) throw new NotFoundException('Expediente no encontrado');
    if (expediente.enteId !== enteId)
      throw new BadRequestException('No tiene permisos sobre este expediente');

    // Validación cronológica básica (ej. Llamado <= Acto Recepción)
    const fechaLlamado = new Date(dto.fechaLlamadoParticipar);
    const fechaActo = new Date(dto.fechaActoRecepcionAperturaSobres);
    const diffDias = BusinessDaysUtil.getBusinessDaysDifference(fechaLlamado, fechaActo);

    const tipo = expediente.modalidad?.tipoContratacion;
    if (tipo === 'BIENES' && diffDias < 7)
      throw new BadRequestException(
        'Para BIENES, el acto de recepción debe ser mínimo 7 días hábiles después del llamado.',
      );
    if (tipo === 'SERVICIOS' && diffDias < 9)
      throw new BadRequestException(
        'Para SERVICIOS, el acto de recepción debe ser mínimo 9 días hábiles después del llamado.',
      );
    if ((tipo === 'OBRAS' || tipo === 'MIXTO') && diffDias < 11)
      throw new BadRequestException(
        'Para OBRAS, el acto de recepción debe ser mínimo 11 días hábiles después del llamado.',
      );

    try {
      return await this.prisma.$transaction(async (tx) => {
        let cronogramaInfo;
        const cronogramaData = {
          fechaLlamadoParticipar: new Date(dto.fechaLlamadoParticipar + 'T00:00:00Z'),
          fechaInicioDisponibilidadPliego: new Date(
            dto.fechaInicioDisponibilidadPliego + 'T00:00:00Z',
          ),
          fechaFinDisponibilidadPliego: new Date(dto.fechaFinDisponibilidadPliego + 'T00:00:00Z'),
          fechaSolicitudAclaratorias: new Date(dto.fechaSolicitudAclaratorias + 'T00:00:00Z'),
          fechaRespuestaAclaratorias: new Date(dto.fechaRespuestaAclaratorias + 'T00:00:00Z'),
          fechaModificacionPliego: new Date(dto.fechaModificacionPliego + 'T00:00:00Z'),
          fechaActoRecepcionAperturaSobres: new Date(
            dto.fechaActoRecepcionAperturaSobres + 'T00:00:00Z',
          ),
          fechaLimiteEvaluacion: new Date(dto.fechaLimiteEvaluacion + 'T00:00:00Z'),
          fechaLimiteAdjudicacion: new Date(dto.fechaLimiteAdjudicacion + 'T00:00:00Z'),
          fechaLimiteNotificacion: new Date(dto.fechaLimiteNotificacion + 'T00:00:00Z'),
          fechaLimiteGarantias: new Date(dto.fechaLimiteGarantias + 'T00:00:00Z'),
          fechaLimiteFirmaContrato: new Date(dto.fechaLimiteFirmaContrato + 'T00:00:00Z'),
          updatedBy: userId,
        };

        if (expediente.cronograma) {
          cronogramaInfo = await tx.cronogramaExpediente.update({
            where: { id: expediente.cronograma.id },
            data: cronogramaData,
          });
        } else {
          cronogramaInfo = await tx.cronogramaExpediente.create({
            data: {
              ...cronogramaData,
              expedienteId: id,
              createdBy: userId,
            },
          });
        }

        // Ya que todos los pasos están listos, pasamos de BORRADOR a EN_PREPARACION
        // (o estado equivalente en el workflow)
        const estatusActual = expediente.estatusProceso;
        let objUpdateExp = {};
        if (estatusActual === 'BORRADOR') {
          objUpdateExp = { estatusProceso: 'EN_PREPARACION' };
        }

        const expedienteInfo = await tx.expedienteContratacion.update({
          where: { id },
          data: {
            ...objUpdateExp,
            updatedBy: userId,
          },
        });

        return {
          message: 'Cronograma guardado exitosamente',
          data: { expediente: expedienteInfo, cronograma: cronogramaInfo },
        };
      });
    } catch (e: unknown) {
      throw new InternalServerErrorException(
        'Error al guardar el cronograma: ' + (e instanceof Error ? e.message : String(e)),
      );
    }
  }
}
