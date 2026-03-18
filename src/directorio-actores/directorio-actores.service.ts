import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GetActoresDto } from './dto/get-actores.dto';

export interface ActorDto {
  id: string;
  nombre: string;
  tipo: 'UNIDAD_CONTRATANTE' | 'UNIDAD_USUARIA' | 'MAXIMA_AUTORIDAD' | 'COMISION_CONTRATACIONES';
  estatus: boolean;
  createdAt: Date;
}

@Injectable()
export class DirectorioActoresService {
  private readonly logger = new Logger(DirectorioActoresService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(enteId: string, query: GetActoresDto) {
    const { page = 1, limit = 10, tipo, estatus } = query;
    const offset = (page - 1) * limit;

    let resultados: ActorDto[] = [];
    const promesas: Promise<void>[] = [];

    // 1. Unidad Contratante
    if (!tipo || tipo === 'UNIDAD_CONTRATANTE') {
      promesas.push(
        this.prisma.unidadContratante
          .findMany({
            where: { enteId },
            select: { id: true, nombreUnidadContratante: true, activa: true, createdAt: true },
          })
          .then((data) => {
            resultados = resultados.concat(
              data.map((item) => ({
                id: item.id,
                nombre: item.nombreUnidadContratante,
                tipo: 'UNIDAD_CONTRATANTE',
                estatus: item.activa,
                createdAt: item.createdAt,
              })),
            );
          }),
      );
    }

    // 2. Unidad Usuaria
    if (!tipo || tipo === 'UNIDAD_USUARIA') {
      promesas.push(
        this.prisma.unidadUsuaria
          .findMany({
            where: { enteId },
            select: { id: true, nombreUnidadUsuaria: true, activa: true, createdAt: true },
          })
          .then((data) => {
            resultados = resultados.concat(
              data.map((item) => ({
                id: item.id,
                nombre: item.nombreUnidadUsuaria,
                tipo: 'UNIDAD_USUARIA',
                estatus: item.activa, // Usando el nuevo campo activa
                createdAt: item.createdAt,
              })),
            );
          }),
      );
    }

    // 3. Maxima Autoridad
    if (!tipo || tipo === 'MAXIMA_AUTORIDAD') {
      promesas.push(
        this.prisma.maximaAutoridad
          .findMany({
            where: { enteId },
            select: { id: true, nombreCompletoAutoridad: true, vigente: true, createdAt: true },
          })
          .then((data) => {
            resultados = resultados.concat(
              data.map((item) => ({
                id: item.id,
                nombre: item.nombreCompletoAutoridad,
                tipo: 'MAXIMA_AUTORIDAD',
                estatus: item.vigente,
                createdAt: item.createdAt,
              })),
            );
          }),
      );
    }

    // 4. Comision de Contrataciones
    if (!tipo || tipo === 'COMISION_CONTRATACIONES') {
      promesas.push(
        this.prisma.comisionContrataciones
          .findMany({
            where: { enteId },
            select: { id: true, denominacionComision: true, activa: true, createdAt: true },
          })
          .then((data) => {
            resultados = resultados.concat(
              data.map((item) => ({
                id: item.id,
                nombre: item.denominacionComision,
                tipo: 'COMISION_CONTRATACIONES',
                estatus: item.activa, // Usando la bandera unificada de borrado pasivo
                createdAt: item.createdAt,
              })),
            );
          }),
      );
    }

    // Ejecutar todas las consultas en paralelo
    await Promise.all(promesas);

    // Aplicar filtro de estatus si fue proporcionado
    if (typeof estatus === 'boolean') {
      resultados = resultados.filter((actor) => actor.estatus === estatus);
    }

    // Ordenar descendente (los más recientes primero)
    resultados.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Paginación en memoria
    const total = resultados.length;
    const paginados = resultados.slice(offset, offset + limit);

    return {
      data: paginados,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit) || 1,
        limit,
      },
    };
  }
}
