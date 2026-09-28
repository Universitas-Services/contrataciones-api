import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Cuerpo común de los PATCH del hub.
 *
 * `draft` guarda el formulario tal como esté, sin aplicar reglas de negocio ni
 * abrir la pestaña siguiente. `confirm` valida, calcula el dictamen en servidor
 * y aplica la compuerta.
 *
 * `form` se tipa como objeto porque su forma depende de la pestaña; la
 * validación real vive en el servicio, que la contrasta contra la plantilla
 * congelada del expediente.
 */
export class HubPatchDto {
  @ApiProperty({
    enum: ['draft', 'confirm'],
    example: 'draft',
    description: 'draft = guardar borrador; confirm = validar y cerrar la pestaña',
  })
  @IsEnum(['draft', 'confirm'], { message: 'La acción debe ser draft o confirm' })
  action: 'draft' | 'confirm';

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Formulario de la pestaña. Su forma depende del módulo.',
  })
  @IsObject({ message: 'El formulario debe ser un objeto' })
  form: Record<string, any>;

  @ApiPropertyOptional({
    description:
      'Sólo en promoción. Se ignora: el servidor usa la nota de evaluación ya persistida.',
  })
  @IsOptional()
  notaBase?: number;
}
