import {
  IsString,
  IsEmail,
  IsArray,
  MinLength,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupervisorDto {
  @ApiProperty({ example: 'Carlos', description: 'Nombre del supervisor' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'Ramírez', description: 'Apellido del supervisor' })
  @IsString()
  apellido: string;

  @ApiProperty({
    example: 'carlos.ramirez@supervision.gob.ve',
    description: 'Email único del supervisor',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'supervisor123',
    description: 'Contraseña (mínimo 6 caracteres)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: ['ente-uuid-1', 'ente-uuid-2'],
    description: 'Lista de IDs de Entes a asignar al supervisor',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe asignar al menos un Ente al supervisor' })
  @IsString({ each: true })
  entesIds: string[]; // Lista de IDs de Entes a asignar
}
