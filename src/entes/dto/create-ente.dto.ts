import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsEmail,
    MinLength,
} from 'class-validator';

export class CreateEnteDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    rif: string;

    @IsString()
    @IsOptional()
    siglas?: string;

    @IsString()
    @IsOptional()
    logoUrl?: string;

    @IsString()
    @IsOptional()
    direccionFiscal?: string;

    @IsString()
    @IsOptional()
    estado?: string;

    @IsString()
    @IsOptional()
    municipio?: string;

    @IsString()
    @IsOptional()
    parroquia?: string;
}
