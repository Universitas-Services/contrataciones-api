import { PartialType } from '@nestjs/swagger';
import { CreateEnteUsuarioDto } from './create-ente-usuario.dto';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEnteUsuarioDto extends PartialType(CreateEnteUsuarioDto) {
  @ApiPropertyOptional({
    description: 'Para habilitar o deshabilitar temporalmente a un usuario',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
