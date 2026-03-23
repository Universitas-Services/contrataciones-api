import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateComisionContratacionesDto } from './dto/create-comision-contrataciones.dto';
import { UpdateComisionContratacionesDto } from './dto/update-comision-contrataciones.dto';
import { TipoMiembro, AreaRepresentacion } from '@prisma/client';
import { CreateMiembroComisionDto } from './dto/create-miembro-comision.dto';

@Injectable()
export class ComisionContratacionesService {
  constructor(private readonly prisma: PrismaService) {}

  private validate8Miembros(miembros: CreateMiembroComisionDto[]) {
    if (!miembros || miembros.length !== 8) {
      throw new BadRequestException(
        'La comisión debe tener exactamente 8 miembros (1 principal y 1 suplente por cada una de las 4 áreas)',
      );
    }

    const requiredCombinations = [
      { area: AreaRepresentacion.AREA_JURIDICA, tipo: TipoMiembro.MIEMBRO_PRINCIPAL },
      { area: AreaRepresentacion.AREA_JURIDICA, tipo: TipoMiembro.MIEMBRO_SUPLENTE },
      { area: AreaRepresentacion.AREA_TECNICA, tipo: TipoMiembro.MIEMBRO_PRINCIPAL },
      { area: AreaRepresentacion.AREA_TECNICA, tipo: TipoMiembro.MIEMBRO_SUPLENTE },
      { area: AreaRepresentacion.AREA_ECONOMICA_FINANCIERA, tipo: TipoMiembro.MIEMBRO_PRINCIPAL },
      { area: AreaRepresentacion.AREA_ECONOMICA_FINANCIERA, tipo: TipoMiembro.MIEMBRO_SUPLENTE },
      { area: AreaRepresentacion.SECRETARIO_A, tipo: TipoMiembro.MIEMBRO_PRINCIPAL },
      { area: AreaRepresentacion.SECRETARIO_A, tipo: TipoMiembro.MIEMBRO_SUPLENTE },
    ];

    for (const req of requiredCombinations) {
      const found = miembros.find(
        (m) => m.areaRepresentacion === req.area && m.tipoMiembro === req.tipo,
      );
      if (!found) {
        throw new BadRequestException(`Falta el miembro con área ${req.area} y rol ${req.tipo}`);
      }
    }
  }

  async create(createDto: CreateComisionContratacionesDto, enteId: string, userId: string) {
    const { miembros, ...comisionData } = createDto;

    this.validate8Miembros(miembros);

    return this.prisma.comisionContrataciones.create({
      data: {
        ...comisionData,
        enteId,
        createdBy: userId,
        miembros: {
          create: miembros.map((miembro) => ({
            ...miembro,
          })),
        },
      },
      include: {
        miembros: true,
      },
    });
  }

  async findAll(enteId: string) {
    return this.prisma.comisionContrataciones.findMany({
      where: {
        enteId,
        deletedAt: null,
      },
      include: {
        miembros: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, enteId: string) {
    const comision = await this.prisma.comisionContrataciones.findFirst({
      where: {
        id,
        enteId,
        deletedAt: null,
      },
      include: {
        miembros: true,
      },
    });

    if (!comision) {
      throw new NotFoundException(`Comisión de Contrataciones con ID ${id} no encontrada`);
    }

    return comision;
  }

  async update(
    id: string,
    updateDto: UpdateComisionContratacionesDto,
    enteId: string,
    userId: string,
  ) {
    await this.findOne(id, enteId);

    const { miembros, ...comisionData } = updateDto;

    if (miembros) {
      this.validate8Miembros(miembros);

      return this.prisma.comisionContrataciones.update({
        where: { id },
        data: {
          ...comisionData,
          updatedBy: userId,
          miembros: {
            deleteMany: {}, // Borra los antiguos
            create: miembros.map((miembro) => ({
              // Crea los 8 nuevos
              ...miembro,
            })),
          },
        },
        include: {
          miembros: true,
        },
      });
    }

    // Si no enviaron miembros, solo actualizamos los datos básicos
    return this.prisma.comisionContrataciones.update({
      where: { id },
      data: {
        ...comisionData,
        updatedBy: userId,
      },
      include: {
        miembros: true,
      },
    });
  }

  async remove(id: string, enteId: string, userId: string) {
    await this.findOne(id, enteId);

    return this.prisma.comisionContrataciones.update({
      where: { id },
      data: {
        activa: false,
        updatedBy: userId,
      },
    });
  }
}
