import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TokensService } from './tokens.service';
import type { ModoRender } from './tokens.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

class ValidarTextoDto {
  @ApiProperty({
    example:
      'El monto total del presente contrato es la cantidad de [MONTO CONTRATO EN LETRAS] ' +
      '(Bs. [MONTO CONTRATO EN NUMEROS]).',
  })
  @IsString()
  @IsNotEmpty({ message: 'El texto es obligatorio' })
  texto: string;
}

class PreviewTextoDto extends ValidarTextoDto {
  @ApiPropertyOptional({
    enum: ['ETIQUETA', 'LINEA', 'VALOR'],
    default: 'ETIQUETA',
    description:
      'ETIQUETA = muestra el nombre del dato (pliego de Fase 1). ' +
      'LINEA = lo sustituye por una línea para llenar a mano. ' +
      'VALOR = inyecta el dato real del expediente (Fase 3 y 4).',
  })
  @IsOptional()
  @IsEnum(['ETIQUETA', 'LINEA', 'VALOR'])
  modo?: ModoRender;

  @ApiPropertyOptional({ description: 'Obligatorio cuando el modo es VALOR' })
  @IsOptional()
  @IsUUID()
  expedienteId?: string;
}

@ApiTags('🏷️ Biblioteca — Datos de Cláusulas')
@ApiBearerAuth('JWT-auth')
@Controller('biblioteca/tokens')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Get()
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS', 'VISUALIZADOR', 'SUPERVISOR')
  @ApiOperation({
    summary: 'Catálogo de datos que pueden insertarse entre corchetes en una cláusula',
    description:
      'Cada elemento trae `insertar` con el texto exacto a colocar en la cláusula, y ' +
      '`disponibleDesde` para saber si el dato ya existe en la Fase 1 o sólo tras adjudicar.',
  })
  @ApiResponse({ status: 200, description: 'Catálogo obtenido exitosamente' })
  listar() {
    return this.tokensService.listarCatalogo();
  }

  @Post('validar')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Validar los corchetes del texto de una cláusula',
    description:
      'Devuelve los datos detectados y, si alguno no existe en el catálogo, el error con ' +
      'una sugerencia de la etiqueta correcta.',
  })
  @ApiBody({ type: ValidarTextoDto })
  validar(@Body() dto: ValidarTextoDto) {
    return this.tokensService.validar(dto.texto);
  }

  @Post('preview')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Previsualizar cómo queda el texto en cada documento',
    description:
      'Permite ver el mismo texto renderizado como saldría en el pliego de la Fase 1 o en ' +
      'el contrato ya adjudicado de la Fase 4.',
  })
  @ApiBody({ type: PreviewTextoDto })
  preview(@Body() dto: PreviewTextoDto) {
    const modo = dto.modo ?? 'ETIQUETA';
    if (modo === 'VALOR' && dto.expedienteId) {
      return this.tokensService.renderizarParaExpediente(dto.texto, dto.expedienteId, modo);
    }
    return {
      modo,
      texto: this.tokensService.renderizar(dto.texto, modo),
      tokens: this.tokensService.extraer(dto.texto),
    };
  }

  @Get('ejemplo')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS', 'VISUALIZADOR', 'SUPERVISOR')
  @ApiOperation({ summary: 'Ejemplo de cláusula con datos entre corchetes' })
  ejemplo(@Query('modo') modo?: ModoRender) {
    const texto =
      'El monto total del presente contrato es la cantidad de [MONTO CONTRATO EN LETRAS] ' +
      '(Bs. [MONTO CONTRATO EN NUMEROS]), imputable a la partida [PARTIDA PRESUPUESTARIA].';
    return {
      original: texto,
      renderizado: this.tokensService.renderizar(texto, modo ?? 'ETIQUETA'),
    };
  }
}
