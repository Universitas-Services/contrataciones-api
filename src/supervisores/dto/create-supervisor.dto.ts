import { IsString, IsEmail, IsArray, MinLength, IsOptional, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupervisorDto {
  @ApiProperty({ example: 'Contraloría Municipal', description: 'Nombre de la Organización Supervisora' })
  @IsString()
  nombreOrganizacion: string;

  @ApiProperty({ example: 'G-20000000-1', description: 'RIF de la Organización Supervisora' })
  @IsString()
  @IsOptional()
  rifOrganizacion?: string;

  @ApiProperty({ example: 'contacto@contraloria.gob.ve', description: 'Email institucional de la Organización' })
  @IsEmail()
  emailOrganizacion: string;

  @ApiProperty({ example: 'Carlos', description: 'Nombre del usuario supervisor' })
  @IsString()
  @MinLength(2)
  nombreUsuario: string;

  @ApiProperty({ example: 'Ramírez', description: 'Apellido del usuario supervisor' })
  @IsString()
  @MinLength(2)
  apellidoUsuario: string;

  @ApiProperty({
    example: 'carlos.ramirez@supervision.gob.ve',
    description: 'Email de acceso del usuario supervisor',
  })
  @IsEmail()
  emailUsuario: string;

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
