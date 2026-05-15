import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateMensajeDto } from './dto/create-mensaje.dto';
import { UpdateTicketEstadoDto } from './dto/update-ticket-estado.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class SoporteService {
  constructor(private readonly prisma: PrismaService) {}

  async crearTicket(enteId: string, creadorId: string, dto: CreateTicketDto) {
    return this.prisma.ticketSoporte.create({
      data: {
        enteId,
        creadorId,
        asunto: dto.asunto,
        descripcion: dto.descripcion,
      },
    });
  }

  async listarTickets(filtros: { enteId?: string; incluirEliminados?: boolean }) {
    const where: any = filtros.enteId ? { enteId: filtros.enteId } : {};

    if (!filtros.incluirEliminados) {
      where.deletedAt = null;
    }

    return this.prisma.ticketSoporte.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        creador: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
        ente: {
          select: { id: true, nombre: true },
        },
        _count: {
          select: { mensajes: true },
        },
      },
    });
  }

  async obtenerTicket(id: string, enteId?: string, incluirEliminados = false) {
    const where: any = { id };
    // Si se provee enteId, significa que es un usuario de un Ente y solo puede ver los suyos
    if (enteId) {
      where.enteId = enteId;
    }

    if (!incluirEliminados) {
      where.deletedAt = null;
    }

    const ticket = await this.prisma.ticketSoporte.findFirst({
      where,
      include: {
        creador: {
          select: { id: true, nombre: true, apellido: true, email: true, rol: true },
        },
        ente: {
          select: { id: true, nombre: true },
        },
        mensajes: {
          orderBy: { createdAt: 'asc' },
          include: {
            remitente: {
              select: { id: true, nombre: true, apellido: true, rol: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado o no tienes permisos para verlo');
    }

    return ticket;
  }

  async agregarMensaje(
    ticketId: string,
    remitenteId: string,
    dto: CreateMensajeDto,
    enteId?: string,
  ) {
    // Validar que el ticket existe y el usuario tiene acceso
    const ticket = await this.obtenerTicket(ticketId, enteId);

    // Crear el mensaje y actualizar la fecha de modificación del ticket
    return this.prisma.$transaction(async (tx) => {
      const mensaje = await tx.mensajeTicket.create({
        data: {
          ticketId: ticket.id,
          remitenteId,
          contenido: dto.contenido,
        },
        include: {
          remitente: {
            select: { id: true, nombre: true, apellido: true, rol: true },
          },
        },
      });

      await tx.ticketSoporte.update({
        where: { id: ticket.id },
        data: { updatedAt: new Date() },
      });

      return mensaje;
    });
  }

  async cambiarEstado(ticketId: string, dto: UpdateTicketEstadoDto) {
    const ticket = await this.prisma.ticketSoporte.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    return this.prisma.ticketSoporte.update({
      where: { id: ticketId },
      data: { estado: dto.estado },
    });
  }

  async editarTicket(ticketId: string, dto: UpdateTicketDto, usuarioId: string, enteId?: string) {
    const ticket = await this.obtenerTicket(ticketId, enteId);

    if (ticket.creadorId !== usuarioId) {
      throw new NotFoundException('No tienes permisos para editar este ticket'); // o ForbiddenException
    }

    if (ticket.estado === 'CERRADO') {
      throw new NotFoundException('No puedes editar un ticket cerrado');
    }

    return this.prisma.ticketSoporte.update({
      where: { id: ticketId },
      data: {
        ...(dto.asunto && { asunto: dto.asunto }),
        ...(dto.descripcion && { descripcion: dto.descripcion }),
      },
    });
  }

  async eliminarTicket(ticketId: string, usuarioId: string, rol: string, enteId?: string) {
    // Universitas (no tiene enteId) puede ver y eliminar eliminados, pero obtenerTicket asume no eliminados por defecto
    const incluirEliminados = rol === 'UNIVERSITAS';
    const ticket = await this.obtenerTicket(ticketId, enteId, incluirEliminados);

    if (rol !== 'UNIVERSITAS' && ticket.creadorId !== usuarioId) {
      throw new NotFoundException('No tienes permisos para eliminar este ticket');
    }

    return this.prisma.ticketSoporte.update({
      where: { id: ticketId },
      data: { deletedAt: new Date() },
    });
  }
}
