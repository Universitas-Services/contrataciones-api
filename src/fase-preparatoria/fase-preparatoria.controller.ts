import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiBody, ApiOperation } from '@nestjs/swagger';
import { FasePreparatoriaService } from './fase-preparatoria.service';
import { CreateFasePreparatoriaDto } from './dto/create-fase-preparatoria.dto';

@ApiTags('Fase Preparatoria')
@Controller('fase-preparatoria')
export class FasePreparatoriaController {
  constructor(private readonly fasePreparatoriaService: FasePreparatoriaService) {}

  @Get(':expedienteId')
  findByExpediente(@Param('expedienteId') expedienteId: string) {
    return this.fasePreparatoriaService.findByExpedienteId(expedienteId);
  }

  // Permite inicializar O actualizar usando el mismo endpoint (upsert)
  @Post(':expedienteId')
  @ApiOperation({ summary: 'Crear o actualizar Fase Preparatoria' })
  @ApiBody({ type: CreateFasePreparatoriaDto })
  upsertFase(
    @Param('expedienteId') expedienteId: string,
    @Body() createFasePreparatoriaDto: CreateFasePreparatoriaDto,
  ) {
    return this.fasePreparatoriaService.upsertByExpedienteId(
      expedienteId,
      createFasePreparatoriaDto,
    );
  }

  // Alias para convención REST (muchos frontends envían PATCH para actualizaciones)
  @Patch(':expedienteId')
  @ApiOperation({ summary: 'Actualizar Fase Preparatoria' })
  @ApiBody({ type: CreateFasePreparatoriaDto })
  updateFase(@Param('expedienteId') expedienteId: string, @Body() dto: CreateFasePreparatoriaDto) {
    return this.fasePreparatoriaService.upsertByExpedienteId(expedienteId, dto);
  }
}
