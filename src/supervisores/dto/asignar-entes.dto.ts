import { IsArray, IsString, IsOptional } from 'class-validator';

export class AsignarEntesDto {
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    agregarEntes?: string[]; // IDs de Entes para asignar

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    removerEntes?: string[]; // IDs de Entes para remover
}
