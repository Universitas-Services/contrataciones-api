import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';

export class ChangeUserPasswordDto {
  @ApiProperty({
    description: 'El ID del usuario (targetUserId) al que se le cambiará la contraseña',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsNotEmpty()
  targetUserId: string;

  @ApiProperty({
    description:
      'La contraseña actual del administrador que realiza la acción (para confirmar identidad)',
    example: 'MiContraseñaActual123!',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    description: 'La nueva contraseña para el usuario objetivo',
    example: 'NuevaContraseña123!',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
  newPassword: string;
}
