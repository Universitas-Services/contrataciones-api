import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CuentasBancariasService } from './cuentas-bancarias.service';
import { CreateCuentaBancariaDto, UpdateCuentaBancariaDto } from './dto/cuenta-bancaria.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UsuarioActual } from '../common/types/usuario-actual.type';

@ApiTags('🏦 Cuentas Bancarias del Ente')
@ApiBearerAuth('JWT-auth')
@Controller('entes/:enteId/cuentas-bancarias')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CuentasBancariasController {
  constructor(private readonly cuentasBancariasService: CuentasBancariasService) {}

  @Get()
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS', 'VISUALIZADOR', 'SUPERVISOR')
  @ApiOperation({ summary: 'Listar las cuentas bancarias registradas del Ente' })
  findAll(@Param('enteId') enteId: string, @CurrentUser() user: UsuarioActual) {
    return this.cuentasBancariasService.findAll(enteId, user);
  }

  @Post()
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Registrar una nueva cuenta bancaria del Ente' })
  @ApiResponse({ status: 201, description: 'Cuenta bancaria creada exitosamente' })
  create(
    @Param('enteId') enteId: string,
    @Body() dto: CreateCuentaBancariaDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.cuentasBancariasService.create(enteId, dto, user);
  }

  @Patch(':id')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Actualizar una cuenta bancaria del Ente' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCuentaBancariaDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.cuentasBancariasService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Eliminar una cuenta bancaria del Ente' })
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioActual) {
    return this.cuentasBancariasService.remove(id, user);
  }
}
