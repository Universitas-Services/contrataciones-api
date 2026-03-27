import { IsString, IsEmail, IsNotEmpty, Matches, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEnteUsuarioDto {
  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Pedro José',
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @ApiProperty({
    description: 'Apellido del usuario',
    example: 'Rodríguez Hernández',
  })
  @IsString({ message: 'El apellido debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  apellido: string;

  @ApiProperty({
    description: 'Correo electrónico',
    example: 'ejemplo@dominio.com',
  })
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email: string;

  @ApiProperty({
    description: 'Contraseña temporal del usuario',
    example: 'A123456*',
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message:
      'La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula, un número y un carácter especial',
  })
  password: string;

  @ApiProperty({
    description: 'Rol que se le asignará al usuario en la plataforma',
    enum: ['ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR'],
    example: 'EJECUTOR',
  })
  @IsString({ message: 'El rol debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El rol es obligatorio' })
  @IsIn(['ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR'], {
    message: 'El rol solo puede ser ADMIN_ENTE, EJECUTOR o VISUALIZADOR',
  })
  rol: 'ADMIN_ENTE' | 'EJECUTOR' | 'VISUALIZADOR';
}
