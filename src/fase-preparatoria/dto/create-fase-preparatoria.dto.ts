import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFasePreparatoriaDto {
  // --- Página 1: Definición Técnica ---
  @ApiPropertyOptional({
    example: 'Acta de Junta Directiva Nro 123-2026',
    description: 'Datos del acto de autorización de inicio',
  })
  @IsOptional()
  @IsString({ message: 'Los datos del acto de autorización deben ser texto' })
  datosActoAutorizacionInicio?: string;

  @ApiPropertyOptional({
    example: '2026-03-31T10:00:00Z',
    description: 'Fecha del acta en formato ISO 8601',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha del acta debe estar en un formato de fecha válido (ISO 8601)' },
  )
  fechaActaInicio?: string;

  @ApiPropertyOptional({
    example: 'Equipos de computación de alto rendimiento según normas ISO',
    description: 'Detalles técnicos y requerimientos de calidad',
  })
  @IsOptional()
  @IsString({ message: 'Los detalles técnicos deben enviarse como texto' })
  detallesTecnicosCalidad?: string;

  @ApiPropertyOptional({
    example: 'Adquisición e instalación de 15 computadoras',
    description: 'Cantidades obra o servicio',
  })
  @IsOptional()
  @IsString({ message: 'El alcance debe ser texto' })
  alcanceCantidadesObra?: string;

  @ApiPropertyOptional({
    example: 'Renovación tecnológica necesaria para operaciones ininterrumpidas',
    description: 'Justificación de contratación',
  })
  @IsOptional()
  @IsString({ message: 'La justificación debe ser un bloque de texto' })
  justificacionVentajas?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Indica si el origen de los recursos cuenta con registro de certificación',
  })
  @IsOptional()
  @IsBoolean({ message: 'El origen CRS debe ser verdadero (true) o falso (false)' })
  @Type(() => Boolean)
  origenCrsRegistro?: boolean;

  // --- Página 3: Parámetros Legales del Pliego ---
  @ApiPropertyOptional({ example: 30, description: 'Días de validez exigidos para la oferta' })
  @IsOptional()
  @IsNumber({}, { message: 'Los días de validez deben presentarse como número' })
  @Type(() => Number)
  diasValidezOferta?: number;

  @ApiPropertyOptional({
    example: 'Director de Administración y Finanzas',
    description: 'Autoridad que atiende requerimientos de aclaratorias',
  })
  @IsOptional()
  @IsString({ message: 'La autoridad debe ser un texto' })
  autoridadAclaratorias?: string;

  @ApiPropertyOptional({
    example: 'Ley de Contrataciones Públicas Art. 123',
    description: 'Base legal vinculada al pliego',
  })
  @IsOptional()
  @IsString({ message: 'La normativa legal debe ser texto' })
  normativaLegal?: string;

  @ApiPropertyOptional({ example: 90, description: 'Días de vigencia sugeridos para garantías' })
  @IsOptional()
  @IsNumber({}, { message: 'Los días de garantía deben ser un número' })
  @Type(() => Number)
  diasVigenciaGarantiaExtension?: number;

  // --- Página 4 y 5: Configuración del Llamado ---
  @ApiPropertyOptional({ example: 'Mejorar el área de IT', description: 'Objetivo específico 1' })
  @IsOptional()
  @IsString({ message: 'El objetivo debe ser texto' })
  objetivosEspecificos1?: string;

  @ApiPropertyOptional({
    example: 'Reducir cuellos de botella mediante hardware actualizado',
    description: 'Objetivo específico 2',
  })
  @IsOptional()
  @IsString({ message: 'El objetivo debe ser texto' })
  objetivosEspecificos2?: string;

  @ApiPropertyOptional({
    example: 'Garantizar respaldos en la nube locales',
    description: 'Objetivo específico 3',
  })
  @IsOptional()
  @IsString({ message: 'El objetivo debe ser texto' })
  objetivosEspecificos3?: string;

  @ApiPropertyOptional({
    example: 'Oficinas principales Piso 2, Coordinación de Compras',
    description: 'Lugar físico para retirar pliego',
  })
  @IsOptional()
  @IsString({ message: 'La dirección debe ser texto' })
  direccionRetiroPliego?: string;

  @ApiPropertyOptional({
    example: 'Lunes a Viernes de 08:00 AM a 12:00 PM',
    description: 'Horario especificado',
  })
  @IsOptional()
  @IsString({ message: 'El horario debe ser texto' })
  horarioRetiroPliego?: string;

  @ApiPropertyOptional({
    example: true,
    description: '¿Es gratuito el pliego para los participantes?',
  })
  @IsOptional()
  @IsBoolean({
    message: 'Se requiere verdadero (true) o falso (false) para indicar si es gratuito',
  })
  @Type(() => Boolean)
  pliegoGratuito?: boolean;

  @ApiPropertyOptional({ example: 0, description: 'Costo calculado del pliego en Bolívares' })
  @IsOptional()
  @IsNumber({}, { message: 'El costo debe ser un valor numérico (puede incluir decimales)' })
  @Type(() => Number)
  costoPliegoBs?: number;

  // Validaciones del pliego no gratuito
  @ApiPropertyOptional({
    example: 'Banco de Venezuela',
    description: 'Obligatorio si pliegoGratuito es false',
  })
  @ValidateIf((o) => o.pliegoGratuito === false)
  @IsNotEmpty({
    message: 'El banco de pago es obligatorio porque indicaste que el pliego NO es gratuito',
  })
  @IsString({ message: 'El banco debe enviarse como texto' })
  bancoPagoPliego?: string;

  @ApiPropertyOptional({
    example: '01020000000000000000',
    description: 'Obligatorio si pliegoGratuito es false',
  })
  @ValidateIf((o) => o.pliegoGratuito === false)
  @IsNotEmpty({ message: 'La cuenta de pago es obligatoria porque el pliego NO es gratuito' })
  @IsString({ message: 'La cuenta debe enviarse como texto' })
  cuentaPagoPliego?: string;

  @ApiPropertyOptional({
    example: 'Alcaldía Municipal RIF G-2000000',
    description: 'Obligatorio si pliegoGratuito es false',
  })
  @ValidateIf((o) => o.pliegoGratuito === false)
  @IsNotEmpty({ message: 'El titular del pago es obligatorio porque el pliego NO es gratuito' })
  @IsString({ message: 'El titular debe ser texto' })
  titularPagoPliego?: string;

  // Resto de Config llamado
  @ApiPropertyOptional({
    example: '10:00 AM',
    description: 'Hora de celebración de recepción y apertura de sobres',
  })
  @IsOptional()
  @IsString({ message: 'La hora del acto debe ser texto' })
  horaActoRecepAper?: string;

  // --- Página 6: Observaciones Finales ---
  @ApiPropertyOptional({
    example: true,
    description: 'Indica si aplica condición plurianual',
  })
  @IsOptional()
  @IsBoolean({ message: 'La condición plurianual debe ser un valor booleano' })
  @Type(() => Boolean)
  condicionPlurianual?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Indica la viabilidad de contrato marco',
  })
  @IsOptional()
  @IsBoolean({ message: 'La viabilidad de contrato marco debe ser un valor booleano' })
  @Type(() => Boolean)
  viabilidadContratoMarco?: boolean;

  @ApiPropertyOptional({
    example: 'Justificación del contrato marco regional corporativo',
    description: 'Justificación opcional del contrato marco',
  })
  @IsOptional()
  @IsString({ message: 'La justificación del contrato marco debe ser un texto' })
  justificacion_contrato_marco_au_au?: string;
}
