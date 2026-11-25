import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProcesoCompletoDto } from './dto/create-proceso-completo.dto';
import { CreateExpedienteDraftDto } from './dto/create-expediente-draft.dto';
import { DeclaracionDesiertoDto } from './dto/declarar-desierto.dto';
import { CreateExpedienteConcursoCerradoDto } from './dto/create-expediente-concurso-cerrado.dto';
import { CreateExpedienteConsultaPreciosDto } from './dto/create-expediente-consulta-precios.dto';
import { CreateExpedienteContratacionDirectaDto } from './dto/create-expediente-contratacion-directa.dto';
import { CreateExpedienteModalidadExcluidaDto } from './dto/create-expediente-modalidad-excluida.dto';
import { UpdateExpedienteGeneralDto } from './dto/update-expediente-general.dto';
import { QueryExpedienteDto } from './dto/query-expedientes.dto';
import { GenerarCronogramaDto } from './dto/generar-cronograma.dto';
import { GenerarCronogramaCCDto } from './dto/generar-cronograma-cc.dto';
import { GenerarCronogramaCPDto } from './dto/generar-cronograma-cp.dto';
import { GenerarCronogramaCDDto } from './dto/generar-cronograma-cd.dto';
import { GenerarCronogramaMEDto } from './dto/generar-cronograma-me.dto';
import { UpdateCronogramaExpedienteDto } from './dto/update-cronograma.dto';
import { EstatusProceso, RolUsuario, Prisma } from '@prisma/client';
import { BusinessDaysUtil } from '../common/utils/business-days.util';
import { CronogramaEnteService } from '../cronograma-ente/cronograma-ente.service';
import { calcularActoUnico, validarActoUnico } from './cronograma-acto-unico.util';
import {
  DOCUMENTOS_DEL_CRONOGRAMA,
  marcarDesactualizados,
} from '../common/utils/documentos-dependientes.util';
import { huboCambios } from '../fase1/invalidacion-documentos.util';

@Injectable()
export class ExpedienteContratacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cronogramaEnteService: CronogramaEnteService,
  ) {}

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

  // --- CREAR BORRADOR ---
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
            tasaReferencialBcv: dto.tasaReferencialBcv,
            fechaActaInicio: dto.fechaActaInicio ? new Date(dto.fechaActaInicio) : undefined,
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
        if (dto.tasaReferencialBcv !== undefined)
          dataExpediente.tasaReferencialBcv = dto.tasaReferencialBcv;
        if (dto.fechaActaInicio !== undefined)
          dataExpediente.fechaActaInicio = new Date(dto.fechaActaInicio);

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
        // Recalcular borra las fechas que el usuario movió a mano: solo si cambió de verdad
        // la fecha del llamado o el tipo de contratación.
        const llamadoActual = expediente.cronograma?.fechaLlamadoParticipar
          ?.toISOString()
          .split('T')[0];
        const cambioLlamado =
          !!dto.fechaLlamadoParticipar &&
          dto.fechaLlamadoParticipar.split('T')[0] !== llamadoActual;
        const cambioTipo =
          !!dto.tipoContratacion &&
          !!expediente.cronograma &&
          dto.tipoContratacion !== expediente.modalidad?.tipoContratacion;
        const triggerCronograma = cambioLlamado || cambioTipo;

        if (triggerCronograma && modalidadInfo) {
          const baseDate = dto.fechaLlamadoParticipar
            ? dto.fechaLlamadoParticipar
            : expediente.cronograma?.fechaLlamadoParticipar
              ? expediente.cronograma.fechaLlamadoParticipar.toISOString().split('T')[0]
              : null;

          if (baseDate) {
            const calculo = await this.generarCronogramaLegal(
              {
                tipoContratacion: modalidadInfo.tipoContratacion,
                fechaLlamadoParticipar: baseDate,
              },
              enteId,
            );

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

        // Solo un cambio real deja desactualizados los documentos. Los datos básicos y los
        // actores salen en todos (membrete y firmas); el cronograma, solo en algunos.
        if (
          this.cambio(expediente, dataExpediente) ||
          (expediente.modalidad && this.cambio(expediente.modalidad, dataModalidad))
        ) {
          await marcarDesactualizados(tx, id);
        } else if (this.cambioCronograma(expediente.cronograma, resultCronograma)) {
          await marcarDesactualizados(tx, id, DOCUMENTOS_DEL_CRONOGRAMA);
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

  // --- DECLARATORIA DE DESIERTO (Art. 113 LCP) ---
  async declararDesierto(
    id: string,
    dto: DeclaracionDesiertoDto,
    userId: string,
    enteId: string,
    rol: RolUsuario,
  ) {
    const expediente = await this.cargarParaDesierto(id, enteId, rol);

    if (expediente.estatusProceso === 'ANULADO')
      throw new BadRequestException('No se puede declarar desierto un expediente anulado');
    if (expediente.declaratoriaDesierto)
      throw new BadRequestException('El expediente ya fue declarado desierto');
    if (/^\s*1\.|ninguna oferta haya sido presentada/i.test(dto.causalDeclaratoriaDesierto)) {
      const ofertas = await this.prisma.ofertaPresentada.count({
        where: { expedienteId: id, deletedAt: null },
      });
      if (ofertas > 0)
        throw new BadRequestException(
          `No puede usar la causal «Ninguna oferta haya sido presentada»: el expediente tiene ${ofertas} ${ofertas === 1 ? 'oferta registrada' : 'ofertas registradas'}.`,
        );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.expedienteContratacion.update({
        where: { id },
        data: {
          declaratoriaDesierto: true,
          causalDeclaratoriaDesierto: dto.causalDeclaratoriaDesierto,
          justificacionDeclaratoriaDesierto: dto.justificacionDeclaratoriaDesierto,
          estatusPrevioDesierto: expediente.estatusProceso,
          estatusProceso: 'DESIERTO',
          updatedBy: userId,
        },
      });
      await marcarDesactualizados(tx, id, ['INFORME_RECOMENDACION']);
      return actualizado;
    });

    return { message: 'Expediente declarado desierto exitosamente', data: result };
  }

  /** Deshace una declaratoria de desierto de la Fase 2 hecha por error. */
  async revertirDesierto(id: string, userId: string, enteId: string, rol: RolUsuario) {
    const expediente = await this.cargarParaDesierto(id, enteId, rol);

    if (expediente.selladoFase4At) {
      throw new ConflictException(
        'El expediente fue cerrado en la Fase 4: la declaratoria no se puede revertir.',
      );
    }
    if (!expediente.declaratoriaDesierto) {
      throw new BadRequestException('El expediente no está declarado desierto.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.expedienteContratacion.update({
        where: { id },
        data: {
          declaratoriaDesierto: false,
          causalDeclaratoriaDesierto: null,
          justificacionDeclaratoriaDesierto: null,
          estatusProceso: await this.estatusAntesDeDesierto(tx, expediente),
          estatusPrevioDesierto: null,
          updatedBy: userId,
        },
      });
      await this.retirarInformeDesierto(tx, id);
      return actualizado;
    });

    return { message: 'Declaratoria de desierto revertida exitosamente', data: result };
  }

  /**
   * El informe de desierto comparte tipo con el de adjudicación. Al declarar se marcó
   * desactualizado el que hubiera, así que uno vigente es el de desierto; y sin informe de
   * adjudicación cargado, cualquiera lo es.
   */
  private async retirarInformeDesierto(tx: Prisma.TransactionClient, expedienteId: string) {
    const informeAdjudicacion = await tx.informeRecomendacion.count({ where: { expedienteId } });
    await tx.documentoGenerado.updateMany({
      where: {
        expedienteId,
        tipoDocumento: 'INFORME_RECOMENDACION',
        deletedAt: null,
        ...(informeAdjudicacion > 0 && { estaDesactualizado: false }),
      },
      data: { deletedAt: new Date() },
    });
  }

  private async cargarParaDesierto(id: string, enteId: string, rol: RolUsuario) {
    const expediente = await this.prisma.expedienteContratacion.findFirst({
      where: { id, deletedAt: null },
    });
    if (!expediente) throw new NotFoundException('Expediente no encontrado');
    if (rol !== 'UNIVERSITAS' && expediente.enteId !== enteId)
      throw new BadRequestException('No tiene permisos para modificar este expediente');
    return expediente;
  }

  /** Las declaratorias anteriores a esta columna no guardaron su estatus: se deduce. */
  private async estatusAntesDeDesierto(
    tx: Prisma.TransactionClient,
    expediente: { id: string; estatusPrevioDesierto: string | null },
  ): Promise<EstatusProceso> {
    const previo = expediente.estatusPrevioDesierto;
    if (previo && previo !== 'DESIERTO' && previo in EstatusProceso) {
      return previo as EstatusProceso;
    }
    const evaluaciones = await tx.evaluacionResultados.count({
      where: { deletedAt: null, oferta: { expedienteId: expediente.id, deletedAt: null } },
    });
    if (evaluaciones > 0) return 'EN_EVALUACION';
    const cronograma = await tx.cronogramaExpediente.count({
      where: { expedienteId: expediente.id },
    });
    return cronograma > 0 ? 'EN_PREPARACION' : 'BORRADOR';
  }

  /** Si alguno de los campos a guardar es distinto del que ya estaba. */
  private cambio(antes: object, data: object): boolean {
    const previo = antes as Record<string, unknown>;
    const nuevo = data as Record<string, unknown>;
    // Los montos llegan como número y se guardan como Decimal.
    const comparable = (v: unknown) =>
      v instanceof Prisma.Decimal || typeof v === 'number' ? Number(v) : v;
    return Object.keys(nuevo).some(
      (campo) =>
        campo !== 'updatedBy' && huboCambios(comparable(previo[campo]), comparable(nuevo[campo])),
    );
  }

  private cambioCronograma(antes: object | null, despues: object | null | undefined): boolean {
    const fechas = (c: object | null | undefined) =>
      Object.fromEntries(Object.entries(c ?? {}).filter(([campo]) => campo.startsWith('fecha')));
    return huboCambios(fechas(antes), fechas(despues));
  }

  // --- GENERACIÓN DE CRONOGRAMA AUTOMÁTICO (PASO 4) ---
  async generarCronogramaLegal(dto: GenerarCronogramaDto, enteId: string) {
    const diasEnte = await this.cronogramaEnteService.getDiasNoLaborablesParaCalculo(enteId);
    const fechaLlamado = new Date(dto.fechaLlamadoParticipar + 'T00:00:00Z'); // Evitar timezone shifts

    const fechas = calcularActoUnico(dto.tipoContratacion, fechaLlamado, diasEnte);
    const iso = (fecha: Date) => fecha.toISOString().split('T')[0];

    return {
      message: 'Cronograma calculado exitosamente basándose en la DLCP',
      data: {
        fechaLlamadoParticipar: iso(fechas.fechaLlamadoParticipar),
        fechaInicioDisponibilidadPliego: iso(fechas.fechaInicioDisponibilidadPliego),
        fechaFinDisponibilidadPliego: iso(fechas.fechaFinDisponibilidadPliego),
        fechaSolicitudAclaratorias: iso(fechas.fechaSolicitudAclaratorias),
        fechaModificacionPliego: iso(fechas.fechaModificacionPliego),
        fechaRespuestaAclaratorias: iso(fechas.fechaRespuestaAclaratorias),
        fechaActoRecepcionAperturaSobres: iso(fechas.fechaActoRecepcionAperturaSobres),
        fechaLimiteEvaluacion: iso(fechas.fechaLimiteEvaluacion),
        fechaLimiteAdjudicacion: iso(fechas.fechaLimiteAdjudicacion),
        fechaLimiteNotificacion: iso(fechas.fechaLimiteNotificacion),
        fechaLimiteGarantias: iso(fechas.fechaLimiteGarantias),
        fechaLimiteFirmaContrato: iso(fechas.fechaLimiteFirmaContrato),
      },
    };
  }

  // --- GUARDAR CRONOGRAMA Y FINALIZAR WIZARD (PASO 4) ---
  async updateCronograma(
    id: string,
    dto: UpdateCronogramaExpedienteDto,
    userId: string,
    enteId: string,
    rol: RolUsuario,
  ) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id },
      include: {
        modalidad: true,
        cronograma: true,
      },
    });

    if (!expediente) throw new NotFoundException('Expediente no encontrado');
    if (rol !== 'UNIVERSITAS' && expediente.enteId !== enteId)
      throw new BadRequestException('No tiene permisos sobre este expediente');

    // Días no laborables del ente del expediente (UNIVERSITAS no tiene ente propio)
    const diasEnte = await this.cronogramaEnteService.getDiasNoLaborablesParaCalculo(
      expediente.enteId,
    );

    // Validación cronológica básica (ej. Llamado <= Acto Recepción)
    const fechaLlamado = new Date(dto.fechaLlamadoParticipar);
    const fechaActo = new Date(dto.fechaActoRecepcionAperturaSobres);
    const diffDias = BusinessDaysUtil.getBusinessDaysDifference(fechaLlamado, fechaActo, diasEnte);

    const tipo = expediente.modalidad?.tipoContratacion;
    const dia = (fecha: string) => new Date(`${fecha.split('T')[0]}T00:00:00Z`);
    if (tipo && expediente.modalidad?.modalidadSeleccion === 'LICITACION_PUBLICA') {
      const errores = validarActoUnico(
        tipo,
        {
          fechaLlamadoParticipar: dia(dto.fechaLlamadoParticipar),
          fechaInicioDisponibilidadPliego: dia(dto.fechaInicioDisponibilidadPliego),
          fechaFinDisponibilidadPliego: dia(dto.fechaFinDisponibilidadPliego),
          fechaActoRecepcionAperturaSobres: dia(dto.fechaActoRecepcionAperturaSobres),
          fechaLimiteEvaluacion: dia(dto.fechaLimiteEvaluacion),
          fechaLimiteAdjudicacion: dia(dto.fechaLimiteAdjudicacion),
          fechaLimiteNotificacion: dia(dto.fechaLimiteNotificacion),
        },
        diasEnte,
      );
      if (errores.length) {
        throw new BadRequestException({ message: errores.join(' '), errores });
      }
    }
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
          tieneConflictoFestivo: false,
          updatedBy: userId,
        };

        if (expediente.cronograma) {
          // Limpiar flag y resolver alertas pendientes si el cronograma ya existía y es actualizado manualmente
          await tx.alertaCronograma.updateMany({
            where: { cronogramaId: expediente.cronograma.id, resuelta: false },
            data: {
              resuelta: true,
              resueltaPor: userId,
              resueltaEn: new Date(),
            },
          });

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

        if (this.cambioCronograma(expediente.cronograma, cronogramaInfo)) {
          await marcarDesactualizados(tx, id, DOCUMENTOS_DEL_CRONOGRAMA);
        }

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

  // =====================================================================
  // CREAR BORRADOR — CONCURSO CERRADO
  // =====================================================================
  async createBorradorCC(dto: CreateExpedienteConcursoCerradoDto, userId: string, enteId: string) {
    if (!enteId) {
      throw new BadRequestException(
        'El usuario no tiene un Ente asignado para realizar esta acción.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const modalidad = await tx.modalidadContratacion.create({
          data: {
            tipoContratacion: dto.tipoContratacion,
            montoEstimadoBs: dto.montoEstimadoBs,
            montoEstimadoDolar: dto.montoEstimadoDolar,
            valorUcauBase: dto.valorUcauBase,
            modalidadSeleccion: 'CONCURSO_CERRADO',
            enteId,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        const expediente = await tx.expedienteContratacion.create({
          data: {
            descripcionObjeto: dto.descripcionObjeto,
            codigoNomenclatura: dto.codigoNomenclatura,
            enteId,
            modalidadId: modalidad.id,
            estatusProceso: 'BORRADOR',
            tasaReferencialBcv: dto.tasaReferencialBcv,
            fechaActaInicio: dto.fechaActaInicio ? new Date(dto.fechaActaInicio) : undefined,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        return {
          message: 'Expediente Concurso Cerrado creado en borrador exitosamente',
          data: { modalidad, expediente },
        };
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException('Error al crear el borrador CC: ' + msg);
    }
  }

  // =====================================================================
  // CREAR BORRADOR — CONSULTA DE PRECIOS
  // =====================================================================
  async createBorradorCP(dto: CreateExpedienteConsultaPreciosDto, userId: string, enteId: string) {
    if (!enteId) {
      throw new BadRequestException(
        'El usuario no tiene un Ente asignado para realizar esta acción.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const modalidad = await tx.modalidadContratacion.create({
          data: {
            tipoContratacion: dto.tipoContratacion,
            montoEstimadoBs: dto.montoEstimadoBs,
            montoEstimadoDolar: dto.montoEstimadoDolar,
            valorUcauBase: dto.valorUcauBase,
            modalidadSeleccion: 'CONSULTA_PRECIOS',
            enteId,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        const expediente = await tx.expedienteContratacion.create({
          data: {
            descripcionObjeto: dto.descripcionObjeto,
            codigoNomenclatura: dto.codigoNomenclatura,
            enteId,
            modalidadId: modalidad.id,
            unidadContratanteId: dto.unidadContratanteId,
            estatusProceso: 'BORRADOR',
            tasaReferencialBcv: dto.tasaReferencialBcv,
            fechaActaInicio: dto.fechaActaInicio ? new Date(dto.fechaActaInicio) : undefined,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        return {
          message: 'Expediente Consulta de Precios creado en borrador exitosamente',
          data: { modalidad, expediente },
        };
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException('Error al crear el borrador CP: ' + msg);
    }
  }

  // =====================================================================
  // CREAR BORRADOR — CONTRATACIÓN DIRECTA
  // =====================================================================
  async createBorradorCD(
    dto: CreateExpedienteContratacionDirectaDto,
    userId: string,
    enteId: string,
  ) {
    if (!enteId) {
      throw new BadRequestException(
        'El usuario no tiene un Ente asignado para realizar esta acción.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const modalidad = await tx.modalidadContratacion.create({
          data: {
            tipoContratacion: dto.tipoContratacion,
            montoEstimadoBs: dto.montoEstimadoBs,
            montoEstimadoDolar: dto.montoEstimadoDolar,
            valorUcauBase: dto.valorUcauBase,
            modalidadSeleccion: 'ADJUDICACION_DIRECTA',
            enteId,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        const expediente = await tx.expedienteContratacion.create({
          data: {
            descripcionObjeto: dto.descripcionObjeto,
            codigoNomenclatura: dto.codigoNomenclatura,
            enteId,
            modalidadId: modalidad.id,
            unidadContratanteId: dto.unidadContratanteId,
            numeralCausalProcedenciaCd: dto.numeralCausalProcedenciaCd,
            causalProcedenciaCd: dto.causalProcedenciaCd,
            estatusProceso: 'BORRADOR',
            tasaReferencialBcv: dto.tasaReferencialBcv,
            fechaActaInicio: dto.fechaActaInicio ? new Date(dto.fechaActaInicio) : undefined,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        return {
          message: 'Expediente Contratación Directa creado en borrador exitosamente',
          data: { modalidad, expediente },
        };
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException('Error al crear el borrador CD: ' + msg);
    }
  }

  // =====================================================================
  // CREAR BORRADOR — MODALIDADES EXCLUIDAS
  // =====================================================================
  async createBorradorME(
    dto: CreateExpedienteModalidadExcluidaDto,
    userId: string,
    enteId: string,
  ) {
    if (!enteId) {
      throw new BadRequestException(
        'El usuario no tiene un Ente asignado para realizar esta acción.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const modalidad = await tx.modalidadContratacion.create({
          data: {
            tipoContratacion: dto.tipoContratacion,
            montoEstimadoBs: dto.montoEstimadoBs,
            montoEstimadoDolar: dto.montoEstimadoDolar,
            valorUcauBase: dto.valorUcauBase,
            modalidadSeleccion: 'MODALIDADES_EXCLUIDAS',
            enteId,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        const expediente = await tx.expedienteContratacion.create({
          data: {
            descripcionObjeto: dto.descripcionObjeto,
            codigoNomenclatura: dto.codigoNomenclatura,
            enteId,
            modalidadId: modalidad.id,
            estatusProceso: 'BORRADOR',
            tasaReferencialBcv: dto.tasaReferencialBcv,
            fechaActaInicio: dto.fechaActaInicio ? new Date(dto.fechaActaInicio) : undefined,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        return {
          message: 'Expediente Modalidad Excluida creado en borrador exitosamente',
          data: { modalidad, expediente },
        };
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException('Error al crear el borrador ME: ' + msg);
    }
  }

  // =====================================================================
  // MOTOR DE CRONOGRAMA — CONCURSO CERRADO (Art. 85 y 87 LCP)
  // =====================================================================
  async generarCronogramaConcursoCerrado(dto: GenerarCronogramaCCDto, enteId: string) {
    const diasEnte = await this.cronogramaEnteService.getDiasNoLaborablesParaCalculo(enteId);
    const fechaInvitacion = new Date(dto.fechaEnvioInvitacion + 'T00:00:00Z');

    let diasFinPliego = 0;
    let diasSolicitudAclaratorias = 0;
    let diasActoRecepcion = 0;
    let diasEvaluacion = 0;
    let diasAdjudicacion = 0;
    let diasNotificacion = 0;

    switch (dto.tipoContratacion) {
      case 'BIENES':
        diasFinPliego = 4;
        diasSolicitudAclaratorias = 2;
        diasActoRecepcion = 5;
        diasEvaluacion = 4;
        diasAdjudicacion = 6;
        diasNotificacion = 8;
        break;
      case 'SERVICIOS':
        diasFinPliego = 5;
        diasSolicitudAclaratorias = 3;
        diasActoRecepcion = 6;
        diasEvaluacion = 5;
        diasAdjudicacion = 8;
        diasNotificacion = 10;
        break;
      case 'OBRAS':
      case 'MIXTO':
        diasFinPliego = 6;
        diasSolicitudAclaratorias = 3;
        diasActoRecepcion = 7;
        diasEvaluacion = 5;
        diasAdjudicacion = 9;
        diasNotificacion = 11;
        break;
    }

    const inicioDispPliego = fechaInvitacion;
    const finDispPliego = BusinessDaysUtil.addBusinessDays(
      fechaInvitacion,
      diasFinPliego,
      diasEnte,
    );
    const solicitudAclaratorias = BusinessDaysUtil.addBusinessDays(
      fechaInvitacion,
      diasSolicitudAclaratorias,
      diasEnte,
    );
    const actoRecepcion = BusinessDaysUtil.addBusinessDays(
      fechaInvitacion,
      diasActoRecepcion,
      diasEnte,
    );

    const respuestaAclaratorias = BusinessDaysUtil.subtractBusinessDays(actoRecepcion, 1, diasEnte);
    const modificacionPliego = BusinessDaysUtil.subtractBusinessDays(actoRecepcion, 2, diasEnte);

    const limiteEvaluacion = BusinessDaysUtil.addBusinessDays(
      actoRecepcion,
      diasEvaluacion,
      diasEnte,
    );
    const limiteAdjudicacion = BusinessDaysUtil.addBusinessDays(
      actoRecepcion,
      diasAdjudicacion,
      diasEnte,
    );
    const limiteNotificacion = BusinessDaysUtil.addBusinessDays(
      actoRecepcion,
      diasNotificacion,
      diasEnte,
    );

    const limiteGarantias = BusinessDaysUtil.addBusinessDays(limiteNotificacion, 5, diasEnte);
    const limiteFirmaContrato = BusinessDaysUtil.addBusinessDays(limiteNotificacion, 8, diasEnte);

    const fmt = (d: Date) => d.toISOString().split('T')[0];

    return {
      message: 'Cronograma Concurso Cerrado calculado exitosamente (Art. 85 y 87 LCP)',
      data: {
        fechaEnvioInvitacion: fmt(fechaInvitacion),
        fechaInicioDisponibilidadPliego: fmt(inicioDispPliego),
        fechaFinDisponibilidadPliego: fmt(finDispPliego),
        fechaSolicitudAclaratorias: fmt(solicitudAclaratorias),
        fechaRespuestaAclaratorias: fmt(respuestaAclaratorias),
        fechaModificacionPliego: fmt(modificacionPliego),
        fechaActoRecepcionAperturaSobres: fmt(actoRecepcion),
        fechaLimiteEvaluacion: fmt(limiteEvaluacion),
        fechaLimiteAdjudicacion: fmt(limiteAdjudicacion),
        fechaLimiteNotificacion: fmt(limiteNotificacion),
        fechaLimiteGarantias: fmt(limiteGarantias),
        fechaLimiteFirmaContrato: fmt(limiteFirmaContrato),
      },
    };
  }

  // =====================================================================
  // MOTOR DE CRONOGRAMA — CONSULTA DE PRECIOS (Art. 96 LCP)
  // =====================================================================
  async generarCronogramaConsultaPrecios(dto: GenerarCronogramaCPDto, enteId: string) {
    const diasEnte = await this.cronogramaEnteService.getDiasNoLaborablesParaCalculo(enteId);
    const fechaInvitacion = new Date(dto.fechaEnvioInvitacion + 'T00:00:00Z');

    let diasRecepcionOfertas = 0;
    let diasEvalAdjNotif = 0;

    switch (dto.tipoContratacion) {
      case 'BIENES':
        diasRecepcionOfertas = 4;
        diasEvalAdjNotif = 8;
        break;
      case 'SERVICIOS':
        diasRecepcionOfertas = 5;
        diasEvalAdjNotif = 9;
        break;
      case 'OBRAS':
      case 'MIXTO':
        diasRecepcionOfertas = 6;
        diasEvalAdjNotif = 10;
        break;
    }

    const solicitudAclaratorias = BusinessDaysUtil.addBusinessDays(fechaInvitacion, 1, diasEnte);
    const recepcionOfertas = BusinessDaysUtil.addBusinessDays(
      fechaInvitacion,
      diasRecepcionOfertas,
      diasEnte,
    );
    const respuestaAclaratorias = BusinessDaysUtil.subtractBusinessDays(
      recepcionOfertas,
      1,
      diasEnte,
    );
    const limiteNotificacion = BusinessDaysUtil.addBusinessDays(
      recepcionOfertas,
      diasEvalAdjNotif,
      diasEnte,
    );
    const limiteGarantias = BusinessDaysUtil.addBusinessDays(limiteNotificacion, 5, diasEnte);
    const limiteFirmaContrato = BusinessDaysUtil.addBusinessDays(limiteNotificacion, 8, diasEnte);

    const fmt = (d: Date) => d.toISOString().split('T')[0];

    return {
      message: 'Cronograma Consulta de Precios calculado exitosamente (Art. 96 LCP)',
      data: {
        fechaEnvioInvitacion: fmt(fechaInvitacion),
        fechaSolicitudAclaratorias: fmt(solicitudAclaratorias),
        fechaRespuestaAclaratorias: fmt(respuestaAclaratorias),
        fechaRecepcionOfertas: fmt(recepcionOfertas),
        fechaLimiteNotificacion: fmt(limiteNotificacion),
        fechaLimiteGarantias: fmt(limiteGarantias),
        fechaLimiteFirmaContrato: fmt(limiteFirmaContrato),
      },
    };
  }

  // =====================================================================
  // MOTOR DE CRONOGRAMA — CONTRATACIÓN DIRECTA (Art. 101 LCP)
  // =====================================================================
  async generarCronogramaContratacionDirecta(dto: GenerarCronogramaCDDto, enteId: string) {
    const diasEnte = await this.cronogramaEnteService.getDiasNoLaborablesParaCalculo(enteId);
    const fechaInvitacion = new Date(dto.fechaEnvioInvitacion + 'T00:00:00Z');

    const recepcionOferta = BusinessDaysUtil.addBusinessDays(fechaInvitacion, 3, diasEnte);
    const limiteAdjudicacion = BusinessDaysUtil.addBusinessDays(recepcionOferta, 2, diasEnte);
    const limiteNotificacion = BusinessDaysUtil.addBusinessDays(limiteAdjudicacion, 1, diasEnte);
    const limiteGarantias = BusinessDaysUtil.addBusinessDays(limiteNotificacion, 5, diasEnte);
    const limiteFirmaContrato = BusinessDaysUtil.addBusinessDays(limiteNotificacion, 8, diasEnte);

    const fmt = (d: Date) => d.toISOString().split('T')[0];

    return {
      message: 'Cronograma Contratación Directa calculado exitosamente (Art. 101 LCP)',
      data: {
        fechaEnvioInvitacion: fmt(fechaInvitacion),
        fechaRecepcionOferta: fmt(recepcionOferta),
        fechaLimiteAdjudicacion: fmt(limiteAdjudicacion),
        fechaLimiteNotificacion: fmt(limiteNotificacion),
        fechaLimiteGarantias: fmt(limiteGarantias),
        fechaLimiteFirmaContrato: fmt(limiteFirmaContrato),
      },
    };
  }

  // =====================================================================
  // MOTOR DE CRONOGRAMA — MODALIDADES EXCLUIDAS
  // =====================================================================
  async generarCronogramaModalidadExcluida(dto: GenerarCronogramaMEDto, enteId: string) {
    const diasEnte = await this.cronogramaEnteService.getDiasNoLaborablesParaCalculo(enteId);
    const fechaInicio = new Date(dto.fechaInicioProcedimiento + 'T00:00:00Z');

    const verificacionRecaudos = BusinessDaysUtil.addBusinessDays(fechaInicio, 2, diasEnte);
    const limiteAdjudicacion = BusinessDaysUtil.addBusinessDays(verificacionRecaudos, 1, diasEnte);
    const limiteGarantias = BusinessDaysUtil.addBusinessDays(limiteAdjudicacion, 5, diasEnte);
    const limiteFirmaContrato = BusinessDaysUtil.addBusinessDays(limiteAdjudicacion, 8, diasEnte);

    const fmt = (d: Date) => d.toISOString().split('T')[0];

    return {
      message: 'Cronograma Modalidad Excluida calculado exitosamente',
      data: {
        fechaInicioProcedimiento: fmt(fechaInicio),
        fechaVerificacionRecaudos: fmt(verificacionRecaudos),
        fechaLimiteAdjudicacion: fmt(limiteAdjudicacion),
        fechaLimiteGarantias: fmt(limiteGarantias),
        fechaLimiteFirmaContrato: fmt(limiteFirmaContrato),
      },
    };
  }
}
