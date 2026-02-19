import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateAdminEnteDto {
  @ApiProperty({
    description: 'Correo electrónico del nuevo administrador',
    example: 'nuevo.admin@ente.gob.ve',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'Seguridad123!',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Carlos',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({
    description: 'Apellido del usuario',
    example: 'Rodriguez',
  })
  @IsString()
  @IsNotEmpty()
  apellido: string;
}
