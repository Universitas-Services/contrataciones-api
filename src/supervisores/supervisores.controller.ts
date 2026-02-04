import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SupervisoresService } from './supervisores.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateSupervisorDto } from './dto/create-supervisor.dto';
import { AsignarEntesDto } from './dto/asignar-entes.dto';

@ApiTags('👨‍💼 Supervisores')
@ApiBearerAuth('JWT-auth')
@Controller('supervisores')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('UNIVERSITAS') // Solo UNIVERSITAS puede gestionar supervisores
export class SupervisoresController {
    constructor(private readonly supervisoresService: SupervisoresService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Crear supervisor', description: 'Crea un nuevo usuario con rol SUPERVISOR y le asigna Entes' })
    @ApiResponse({ status: 201, description: 'Supervisor creado exitosamente' })
    @ApiResponse({ status: 409, description: 'Email ya registrado' })
    create(@Body() createDto: CreateSupervisorDto, @CurrentUser() user: any) {
        return this.supervisoresService.create(createDto, user.id);
    }

    @Get()
    @ApiOperation({ summary: 'Listar supervisores', description: 'Obtiene la lista de todos los supervisores del sistema' })
    @ApiResponse({ status: 200, description: 'Lista de supervisores' })
    findAll() {
        return this.supervisoresService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Ver supervisor', description: 'Obtiene los detalles de un supervisor específico incluyendo sus Entes asignados' })
    @ApiParam({ name: 'id', description: 'ID del supervisor' })
    @ApiResponse({ status: 200, description: 'Detalles del supervisor' })
    @ApiResponse({ status: 404, description: 'Supervisor no encontrado' })
    findOne(@Param('id') id: string) {
        return this.supervisoresService.findOne(id);
    }

    @Put(':id/asignar-entes')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Asignar/Remover Entes', description: 'Modifica dinámicamente los Entes asignados a un supervisor' })
    @ApiParam({ name: 'id', description: 'ID del supervisor' })
    @ApiResponse({ status: 200, description: 'Asignación actualizada' })
    @ApiResponse({ status: 404, description: 'Supervisor no encontrado' })
    async asignarEntes(
        @Param('id') id: string,
        @Body() dto: AsignarEntesDto,
        @CurrentUser() user: any,
    ) {
        return this.supervisoresService.asignarEntes(id, dto, user.id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Eliminar supervisor', description: 'Elimina un supervisor (soft delete)' })
    @ApiParam({ name: 'id', description: 'ID del supervisor' })
    @ApiResponse({ status: 200, description: 'Supervisor eliminado' })
    @ApiResponse({ status: 404, description: 'Supervisor no encontrado' })
    remove(@Param('id') id: string, @CurrentUser() user: any) {
        return this.supervisoresService.remove(id, user.id);
    }
}
