import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'password123',
    description: 'La contraseña actual del usuario',
  })
  @IsNotEmpty({ message: 'La contraseña actual es requerida' })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'La nueva contraseña para el usuario (min 6 caracteres)',
  })
  @IsNotEmpty({ message: 'La nueva contraseña es requerida' })
  @IsString()
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
  newPassword: string;
}
