import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateDiaNoLaborableDto } from './dto/create-dia-no-laborable.dto';
import { CreateDiaNoLaborableBulkDto } from './dto/create-dia-no-laborable-bulk.dto';
import { UpdateDiaNoLaborableDto } from './dto/update-dia-no-laborable.dto';
import { QueryDiaNoLaborableDto } from './dto/query-dia-no-laborable.dto';
import { EstatusProceso } from '@prisma/client';

const CAMPOS_CRONOGRAMA = [
  { campo: 'fechaLlamadoParticipar', etiqueta: 'Llamado a Participar' },
  { campo: 'fechaInicioDisponibilidadPliego', etiqueta: 'Inicio Disponibilidad del Pliego' },
  { campo: 'fechaFinDisponibilidadPliego', etiqueta: 'Fin Disponibilidad del Pliego' },
  { campo: 'fechaSolicitudAclaratorias', etiqueta: 'Límite para Solicitud de Aclaratorias' },
  { campo: 'fechaRespuestaAclaratorias', etiqueta: 'Límite para Respuesta de Aclaratorias' },
  { campo: 'fechaModificacionPliego', etiqueta: 'Límite para Modificaciones al Pliego' },
  { campo: 'fechaActoRecepcionAperturaSobres', etiqueta: 'Acto de Recepción de Ofertas' },
  { campo: 'fechaLimiteEvaluacion', etiqueta: 'Límite para Evaluación' },
  { campo: 'fechaLimiteAdjudicacion', etiqueta: 'Límite para Adjudicación' },
  { campo: 'fechaLimiteNotificacion', etiqueta: 'Límite para Notificación' },
  { campo: 'fechaLimiteGarantias', etiqueta: 'Límite para Consignar Garantías' },
  { campo: 'fechaLimiteFirmaContrato', etiqueta: 'Límite para Firma del Contrato' },
];

const ESTATUS_ACTIVOS: EstatusProceso[] = [
  'BORRADOR',
  'EN_PREPARACION',
  'PUBLICADO',
  'EN_EVALUACION',
];

@Injectable()
export class CronogramaEnteService {
  constructor(private readonly prisma: PrismaService) {}

  // === CRUD ===

  async create(dto: CreateDiaNoLaborableDto, userId: string, enteId: string) {
    // 1. Validar que no exista duplicado
    if (dto.esRecurrente) {
      if (!dto.fechaRecurrente) {
        throw new ConflictException(
          'Debe proporcionar una fecha recurrente en formato MM-DD para festivos recurrentes.',
        );
      }
      const existe = await this.prisma.diaNoLaborableEnte.findFirst({
        where: { enteId, fechaRecurrente: dto.fechaRecurrente, deletedAt: null },
      });
      if (existe) {
        throw new ConflictException(
          `Ya existe el festivo recurrente ${dto.fechaRecurrente} para este ente.`,
        );
      }
    } else {
      if (!dto.fecha) {
        throw new ConflictException(
          'Debe proporcionar una fecha específica para festivos no recurrentes.',
        );
      }
      const fechaObj = new Date(dto.fecha + 'T00:00:00Z');
      const existe = await this.prisma.diaNoLaborableEnte.findFirst({
        where: { enteId, fecha: fechaObj, deletedAt: null },
      });
      if (existe) {
        throw new ConflictException(
          `Ya existe un festivo registrado para la fecha ${dto.fecha} en este ente.`,
        );
      }
    }

    // 2. Crear el día no laborable
    const diaNoLaborable = await this.prisma.diaNoLaborableEnte.create({
      data: {
        enteId,
        esRecurrente: dto.esRecurrente,
        descripcion: dto.descripcion,
        fecha: dto.fecha ? new Date(dto.fecha + 'T00:00:00Z') : null,
        fechaRecurrente: dto.esRecurrente ? dto.fechaRecurrente : null,
        createdBy: userId,
      },
    });

    // 3. Detectar conflictos en cronogramas activos
    const conflictosDetectados = await this.detectarConflictos(enteId, diaNoLaborable);

    return {
      diaNoLaborable,
      conflictosDetectados,
      totalConflictos: conflictosDetectados.length,
    };
  }

  async createBulk(dto: CreateDiaNoLaborableBulkDto, userId: string, enteId: string) {
    const creados: any[] = [];
    let todosLosConflictos: any[] = [];

    for (const diaDto of dto.dias) {
      try {
        const resultado = await this.create(diaDto, userId, enteId);
        creados.push(resultado.diaNoLaborable);
        todosLosConflictos = todosLosConflictos.concat(resultado.conflictosDetectados);
      } catch (error) {
        // En bulk, si uno ya existe o falla por validación interna, lo ignoramos o propagamos.
        // Por consistencia en cargas masivas, ignoramos duplicados para no romper el proceso.
        if (!(error instanceof ConflictException)) {
          throw error;
        }
      }
    }

    return {
      diasCreados: creados,
      conflictosDetectados: todosLosConflictos,
      totalConflictos: todosLosConflictos.length,
    };
  }

  async findAll(enteId: string, query: QueryDiaNoLaborableDto) {
    const { page = 1, limit = 10, anio } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      enteId,
      deletedAt: null,
    };

    if (anio) {
      // Si se filtra por año, buscamos recurrentes (que aplican a todos los años) o específicos de ese año.
      whereClause.OR = [
        { esRecurrente: true },
        {
          esRecurrente: false,
          fecha: {
            gte: new Date(`${anio}-01-01T00:00:00Z`),
            lte: new Date(`${anio}-12-31T23:59:59Z`),
          },
        },
      ];
    }

    const [dias, total] = await Promise.all([
      this.prisma.diaNoLaborableEnte.findMany({
        where: whereClause,
        orderBy: [{ esRecurrente: 'desc' }, { fecha: 'asc' }, { fechaRecurrente: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.diaNoLaborableEnte.count({ where: whereClause }),
    ]);

    return {
      data: dias,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, enteId: string) {
    const dia = await this.prisma.diaNoLaborableEnte.findFirst({
      where: { id, enteId, deletedAt: null },
    });
    if (!dia) {
      throw new NotFoundException('Día no laborable no encontrado.');
    }
    return dia;
  }

  async update(id: string, dto: UpdateDiaNoLaborableDto, userId: string, enteId: string) {
    const dia = await this.findOne(id, enteId);

    // Si intenta cambiar a un valor que colisione
    if (
      dto.esRecurrente !== undefined ||
      dto.fechaRecurrente !== undefined ||
      dto.fecha !== undefined
    ) {
      const nuevoEsRecurrente =
        dto.esRecurrente !== undefined ? dto.esRecurrente : dia.esRecurrente;

      if (nuevoEsRecurrente) {
        const nuevoRecurrente = dto.fechaRecurrente || dia.fechaRecurrente;
        if (!nuevoRecurrente) {
          throw new ConflictException('Debe proporcionar fechaRecurrente en formato MM-DD.');
        }
        const existe = await this.prisma.diaNoLaborableEnte.findFirst({
          where: {
            enteId,
            fechaRecurrente: nuevoRecurrente,
            deletedAt: null,
            id: { not: id },
          },
        });
        if (existe) {
          throw new ConflictException(
            `Ya existe el festivo recurrente ${nuevoRecurrente} para este ente.`,
          );
        }
      } else {
        const nuevaFechaStr =
          dto.fecha || (dia.fecha ? dia.fecha.toISOString().split('T')[0] : null);
        if (!nuevaFechaStr) {
          throw new ConflictException('Debe proporcionar una fecha específica.');
        }
        const nuevaFechaObj = new Date(nuevaFechaStr + 'T00:00:00Z');
        const existe = await this.prisma.diaNoLaborableEnte.findFirst({
          where: {
            enteId,
            fecha: nuevaFechaObj,
            deletedAt: null,
            id: { not: id },
          },
        });
        if (existe) {
          throw new ConflictException(
            `Ya existe un festivo registrado para la fecha ${nuevaFechaStr} en este ente.`,
          );
        }
      }
    }

    const actualizado = await this.prisma.diaNoLaborableEnte.update({
      where: { id },
      data: {
        esRecurrente: dto.esRecurrente !== undefined ? dto.esRecurrente : dia.esRecurrente,
        descripcion: dto.descripcion !== undefined ? dto.descripcion : dia.descripcion,
        fecha: dto.fecha ? new Date(dto.fecha + 'T00:00:00Z') : dto.esRecurrente ? null : dia.fecha,
        fechaRecurrente: dto.fechaRecurrente
          ? dto.fechaRecurrente
          : dto.esRecurrente
            ? dia.fechaRecurrente
            : null,
        updatedBy: userId,
      },
    });

    // Nota: Al actualizar no recalculamos conflictos automáticamente para evitar sobrecarga o falsos positivos.
    // Solo la creación de nuevos días lanza detección automática.

    return actualizado;
  }

  async remove(id: string, userId: string, enteId: string) {
    await this.findOne(id, enteId);

    // Soft delete
    await this.prisma.diaNoLaborableEnte.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    // Resolver automáticamente todas las alertas asociadas a este día que ya no es festivo
    await this.prisma.alertaCronograma.updateMany({
      where: { diaNoLaborableId: id, resuelta: false },
      data: {
        resuelta: true,
        resueltaPor: userId,
        resueltaEn: new Date(),
      },
    });

    return { message: 'Día no laborable eliminado exitosamente.' };
  }

  // === Consulta de Calendario para el Frontend ===

  async getDiasNoLaborables(enteId: string, desde: string, hasta: string) {
    const desdeDate = new Date(desde + 'T00:00:00Z');
    const hastaDate = new Date(hasta + 'T00:00:00Z');

    // 1. Obtener festivos del ente
    const festivosEnte = await this.prisma.diaNoLaborableEnte.findMany({
      where: {
        enteId,
        deletedAt: null,
      },
    });

    const diasNoLaborables: any[] = [];
    const finesDeSemana: string[] = [];

    // Iterar día por día en el rango
    const current = new Date(desdeDate);
    while (current <= hastaDate) {
      const currentStr = current.toISOString().split('T')[0];
      const day = current.getDay();

      if (day === 0 || day === 6) {
        finesDeSemana.push(currentStr);
      } else {
        // Verificar si coincide con festivo específico
        const festivoEspecifico = festivosEnte.find(
          (f) => !f.esRecurrente && f.fecha && f.fecha.toISOString().split('T')[0] === currentStr,
        );

        // Verificar si coincide con festivo recurrente (MM-DD)
        const mm = String(current.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(current.getUTCDate()).padStart(2, '0');
        const mmdd = `${mm}-${dd}`;
        const festivoRecurrente = festivosEnte.find(
          (f) => f.esRecurrente && f.fechaRecurrente === mmdd,
        );

        const festivoEncontrado = festivoEspecifico || festivoRecurrente;
        if (festivoEncontrado) {
          diasNoLaborables.push({
            fecha: currentStr,
            descripcion: festivoEncontrado.descripcion,
            tipo: 'FESTIVO_ENTE',
            esRecurrente: festivoEncontrado.esRecurrente,
          });
        }
      }

      current.setDate(current.getDate() + 1);
    }

    const totalFinesDesemana = finesDeSemana.length;
    const totalFestivosEnte = diasNoLaborables.length;
    const totalDiasNoLaborables = totalFinesDesemana + totalFestivosEnte;
    const totalDiasRango =
      Math.floor((hastaDate.getTime() - desdeDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalDiasHabiles = totalDiasRango - totalDiasNoLaborables;

    return {
      diasNoLaborables,
      finesDeSemana,
      resumen: {
        totalDiasNoLaborables,
        totalDiasHabiles,
        totalFestivosEnte,
        totalFinesDesemana,
      },
    };
  }

  // === Utilidades para Cálculo de Cronograma ===

  async getDiasNoLaborablesParaCalculo(enteId: string): Promise<string[]> {
    const festivos = await this.prisma.diaNoLaborableEnte.findMany({
      where: { enteId, deletedAt: null },
      select: { fecha: true, fechaRecurrente: true, esRecurrente: true },
    });

    return festivos
      .map((f) => {
        if (f.esRecurrente && f.fechaRecurrente) {
          return f.fechaRecurrente;
        }
        if (!f.esRecurrente && f.fecha) {
          return f.fecha.toISOString().split('T')[0];
        }
        return null;
      })
      .filter(Boolean) as string[];
  }

  // === Detección de Conflictos ===

  async detectarConflictos(enteId: string, diaNoLaborable: any) {
    // 1. Obtener todos los expedientes del ente en estados activos
    const expedientesActivos = await this.prisma.expedienteContratacion.findMany({
      where: {
        enteId,
        estatusProceso: { in: ESTATUS_ACTIVOS },
        cronograma: { isNot: null },
      },
      include: {
        cronograma: true,
      },
    });

    const conflictosRealizados: any[] = [];

    for (const exp of expedientesActivos) {
      const cronograma = exp.cronograma;
      if (!cronograma) continue;

      const camposAfectados: any[] = [];

      for (const mapping of CAMPOS_CRONOGRAMA) {
        const fechaCampo = cronograma[mapping.campo] as Date;
        if (!fechaCampo) continue;

        let hayConflicto = false;
        const fechaCampoStr = fechaCampo.toISOString().split('T')[0];

        if (diaNoLaborable.esRecurrente) {
          const mm = String(fechaCampo.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(fechaCampo.getUTCDate()).padStart(2, '0');
          const mmdd = `${mm}-${dd}`;
          if (diaNoLaborable.fechaRecurrente === mmdd) {
            hayConflicto = true;
          }
        } else {
          const fechaFestivoStr = diaNoLaborable.fecha.toISOString().split('T')[0];
          if (fechaFestivoStr === fechaCampoStr) {
            hayConflicto = true;
          }
        }

        if (hayConflicto) {
          camposAfectados.push({
            campo: mapping.campo,
            etiqueta: mapping.etiqueta,
            fechaActual: fechaCampoStr,
          });

          // Crear AlertaCronograma en base de datos
          await this.prisma.alertaCronograma.create({
            data: {
              cronogramaId: cronograma.id,
              diaNoLaborableId: diaNoLaborable.id,
              campoAfectado: mapping.campo,
              fechaConflicto: fechaCampo,
            },
          });
        }
      }

      if (camposAfectados.length > 0) {
        // Marcar el cronograma con conflicto festivo activo
        await this.prisma.cronogramaExpediente.update({
          where: { id: cronograma.id },
          data: { tieneConflictoFestivo: true },
        });

        conflictosRealizados.push({
          expedienteId: exp.id,
          codigoNomenclatura: exp.codigoNomenclatura,
          descripcionObjeto: exp.descripcionObjeto,
          estatusProceso: exp.estatusProceso,
          camposAfectados,
        });
      }
    }

    return conflictosRealizados;
  }

  // === Alertas ===

  async getAlertas(enteId: string) {
    return this.prisma.alertaCronograma.findMany({
      where: {
        resuelta: false,
        cronograma: {
          expediente: {
            enteId,
          },
        },
      },
      include: {
        diaNoLaborable: true,
        cronograma: {
          include: {
            expediente: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolverAlerta(alertaId: string, userId: string, enteId: string) {
    const alerta = await this.prisma.alertaCronograma.findFirst({
      where: {
        id: alertaId,
        cronograma: {
          expediente: {
            enteId,
          },
        },
      },
    });

    if (!alerta) {
      throw new NotFoundException('Alerta no encontrada.');
    }

    const resuelta = await this.prisma.alertaCronograma.update({
      where: { id: alertaId },
      data: {
        resuelta: true,
        resueltaPor: userId,
        resueltaEn: new Date(),
      },
    });

    // Verificar si quedan alertas pendientes para el mismo cronograma
    const alertasPendientes = await this.prisma.alertaCronograma.count({
      where: {
        cronogramaId: alerta.cronogramaId,
        resuelta: false,
      },
    });

    if (alertasPendientes === 0) {
      await this.prisma.cronogramaExpediente.update({
        where: { id: alerta.cronogramaId },
        data: { tieneConflictoFestivo: false },
      });
    }

    return resuelta;
  }
}
