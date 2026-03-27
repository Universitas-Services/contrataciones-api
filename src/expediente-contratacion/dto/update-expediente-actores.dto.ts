import { IsString, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateExpedienteActoresDto {
  @ApiProperty({ description: 'ID de la Máxima Autoridad' })
  @IsString()
  @IsNotEmpty()
  autoridadId: string;

  @ApiProperty({ description: 'ID de la Comisión de Contrataciones' })
  @IsString()
  @IsNotEmpty()
  comisionId: string;

  @ApiProperty({ description: 'ID de la Unidad Usuaria' })
  @IsString()
  @IsNotEmpty()
  unidadUsuariaId: string;

  @ApiProperty({
    description: 'Fecha central del cronograma (Llamado a Participar)',
    example: '2026-03-02',
  })
  @IsDateString()
  @IsNotEmpty()
  fechaLlamadoParticipar: string;
}
