import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsDateString,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';

export class SaveContratoDto {
  // --- Sección A: Tiempos de ejecución y montos ---
  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  fechaInicioVigencia: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  fechaFinVigencia: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  montoContratoBs: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  plazoEjecucionDias: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  plazoGarantiaCalidadFuncionamiento: string;

  // --- Sección B: Supervisión, aceptación y pago ---
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombreSupervisor: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cedulaSupervisor: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cargoSupervisor: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  criterioAceptacionContrato: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  plazoConsignacionFacturas: number;

  // --- Sección C: Finanzas contractuales y compromiso social ---
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  montoFielCumplimientoBs: number;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  requiereGarantiaLaboral: boolean;

  @ApiProperty()
  @ValidateIf((o) => o.requiereGarantiaLaboral === true)
  @IsNumber()
  @IsNotEmpty()
  porcentajeGarantiaLaboral?: number;

  @ApiProperty()
  @ValidateIf((o) => o.requiereGarantiaLaboral === true)
  @IsNumber()
  @IsNotEmpty()
  montoGarantiaLaboralBs?: number;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  polizaResponsabilidadCivil: boolean;

  @ApiProperty()
  @ValidateIf((o) => o.polizaResponsabilidadCivil === true)
  @IsNumber()
  @IsNotEmpty()
  porcentajeResponsabilidadCivil?: number;

  @ApiProperty()
  @ValidateIf((o) => o.polizaResponsabilidadCivil === true)
  @IsNumber()
  @IsNotEmpty()
  montoResponsabilidadCivilBs?: number;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  anticipoContrato: boolean;

  @ApiProperty()
  @ValidateIf((o) => o.anticipoContrato === true)
  @IsNumber()
  @IsNotEmpty()
  porcentajeAnticipoOtorgado?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  formaCumplimientoCrs: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  unidadRespCumplimientoCrs: string;

  // --- Sección D: Penalidades, ajustes y cierre legal ---
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  porcentajeMultaDiaria: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  baseCalculoMultaDiaria: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  plazoRegularizarIncumplimiento: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  porcentajeProcedimientoRescision: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  formulaAjustePrecios: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  evaluacionDesempeno: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  garantiaPostEjecucion: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lugarTribunal: string;
}
