import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { OfertaPresentadaService } from './oferta-presentada.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateOfertaPresentadaDto } from './dto/create-oferta-presentada.dto';
import { UpdateOfertaPresentadaDto } from './dto/update-oferta-presentada.dto';

@ApiTags('📑 Ofertas Presentadas (Participantes)')
@ApiBearerAuth('JWT-auth')
@Controller('ofertas-presentadas')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
export class OfertaPresentadaController {
  constructor(private readonly ofertaPresentadaService: OfertaPresentadaService) {}

  @Post()
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar oferente',
    description: 'Registra una nueva oferta presentada para un expediente de contratación.',
  })
  @ApiResponse({ status: 201, description: 'Oferta registrada exitosamente' })
  async create(
    @Body() dto: CreateOfertaPresentadaDto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.ofertaPresentadaService.create(dto, user.id, user.enteId);
  }

  @Get('expediente/:expedienteId')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Listar oferentes por expediente',
  })
  @ApiParam({ name: 'expedienteId', description: 'ID del expediente' })
  async findAll(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: { enteId: string },
  ) {
    return this.ofertaPresentadaService.findAllByExpediente(expedienteId, user.enteId);
  }

  @Get(':id')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Obtener detalle de una oferta',
  })
  async findOne(@Param('id') id: string, @CurrentUser() user: { enteId: string }) {
    return this.ofertaPresentadaService.findOne(id, user.enteId);
  }

  @Patch(':id')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Actualizar datos de una oferta',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOfertaPresentadaDto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.ofertaPresentadaService.update(id, dto, user.id, user.enteId);
  }

  @Delete(':id')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Eliminar una oferta',
  })
  async remove(@Param('id') id: string, @CurrentUser() user: { id: string; enteId: string }) {
    return this.ofertaPresentadaService.remove(id, user.id, user.enteId);
  }
}
