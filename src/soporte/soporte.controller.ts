import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SoporteService } from './soporte.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateMensajeDto } from './dto/create-mensaje.dto';
import { UpdateTicketEstadoDto } from './dto/update-ticket-estado.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@ApiTags('Soporte')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('soporte')
export class SoporteController {
  constructor(private readonly soporteService: SoporteService) {}

  @Post('tickets')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR')
  @ApiOperation({ summary: 'Crear un nuevo ticket de soporte' })
  createTicket(@Body() dto: CreateTicketDto, @CurrentUser() user: { id: string; enteId: string }) {
    return this.soporteService.crearTicket(user.enteId, user.id, dto);
  }

  @Get('tickets')
  @ApiOperation({
    summary: 'Listar tickets (Filtrados por Ente automáticamente si aplica)',
  })
  findAllTickets(@CurrentUser() user: { id: string; rol: string; enteId?: string }) {
    // Si es UNIVERSITAS, no se filtra por Ente. Si no, solo ve los de su Ente.
    const enteId = user.rol === 'UNIVERSITAS' ? undefined : user.enteId;
    const incluirEliminados = user.rol === 'UNIVERSITAS';
    return this.soporteService.listarTickets({ enteId, incluirEliminados });
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Obtener el detalle de un ticket con sus mensajes' })
  findOneTicket(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; rol: string; enteId?: string },
  ) {
    const enteId = user.rol === 'UNIVERSITAS' ? undefined : user.enteId;
    const incluirEliminados = user.rol === 'UNIVERSITAS';
    return this.soporteService.obtenerTicket(id, enteId, incluirEliminados);
  }

  @Post('tickets/:id/mensajes')
  @ApiOperation({ summary: 'Agregar un mensaje a un hilo (ticket) existente' })
  addMessage(
    @Param('id') id: string,
    @Body() dto: CreateMensajeDto,
    @CurrentUser() user: { id: string; rol: string; enteId?: string },
  ) {
    const enteId = user.rol === 'UNIVERSITAS' ? undefined : user.enteId;
    return this.soporteService.agregarMensaje(id, user.id, dto, enteId);
  }

  @Patch('tickets/:id/estado')
  @Roles('UNIVERSITAS')
  @ApiOperation({ summary: 'Cambiar el estado de un ticket (Solo Universitas)' })
  updateTicketEstado(@Param('id') id: string, @Body() dto: UpdateTicketEstadoDto) {
    return this.soporteService.cambiarEstado(id, dto);
  }

  @Patch('tickets/:id')
  @ApiOperation({ summary: 'Editar el asunto o descripción de un ticket abierto (Solo creador)' })
  updateTicket(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: { id: string; rol: string; enteId?: string },
  ) {
    const enteId = user.rol === 'UNIVERSITAS' ? undefined : user.enteId;
    return this.soporteService.editarTicket(id, dto, user.id, enteId);
  }

  @Delete('tickets/:id')
  @ApiOperation({ summary: 'Eliminar un ticket pasivamente (Creador o Universitas)' })
  removeTicket(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; rol: string; enteId?: string },
  ) {
    const enteId = user.rol === 'UNIVERSITAS' ? undefined : user.enteId;
    return this.soporteService.eliminarTicket(id, user.id, user.rol, enteId);
  }
}
