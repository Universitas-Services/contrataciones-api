import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSobre1Dto {
  @ApiPropertyOptional({
    description:
      '¿Consignó carta de Manifestación de Voluntad? (carta_manifestacion_voluntad_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  cartaManifestacionVoluntad?: boolean;

  @ApiPropertyOptional({
    description:
      'Observación sobre carta de manifestación de voluntad (obs_carta_manifestacion_voluntad_au_au)',
  })
  @IsString()
  @IsOptional()
  obsCartaManifestacionVoluntad?: string;

  @ApiPropertyOptional({
    description: '¿Consignó Carta de Autorización? (carta_autorizacion_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  cartaAutorizacion?: boolean;

  @ApiPropertyOptional({
    description: 'Observación sobre carta de autorización (obs_carta_autorizacion_au_au)',
  })
  @IsString()
  @IsOptional()
  obsCartaAutorizacion?: string;

  @ApiPropertyOptional({
    description: '¿Consignó copia del RIF vigente? (copia_rif_vigente_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  copiaRifVigente?: boolean;

  @ApiPropertyOptional({
    description: 'Observación sobre copia del RIF (obs_copia_rif_vigente_au_au)',
  })
  @IsString()
  @IsOptional()
  obsCopiaRifVigente?: string;

  @ApiPropertyOptional({
    description: '¿Consignó certificado de inscripción en el RNC? (certificado_rnc_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  certificadoRnc?: boolean;

  @ApiPropertyOptional({
    description: 'Observación sobre certificado RNC (obs_certificado_rnc_au_au)',
  })
  @IsString()
  @IsOptional()
  obsCertificadoRnc?: string;

  @ApiPropertyOptional({ description: '¿Consignó Solvencia Laboral? (solvencia_laboral_au_au)' })
  @IsBoolean()
  @IsOptional()
  solvenciaLaboral?: boolean;

  @ApiPropertyOptional({
    description: 'Observación sobre solvencia laboral (obs_solvencia_laboral_au_au)',
  })
  @IsString()
  @IsOptional()
  obsSolvenciaLaboral?: string;

  @ApiPropertyOptional({
    description:
      '¿Consignó Declaración de socios no inhabilitados? (declaracion_socios_no_inhabilitados_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  declaracionSociosNoInhabilitados?: boolean;

  @ApiPropertyOptional({
    description: 'Observación (obs_declaracion_socios_no_inhabilitados_au_au)',
  })
  @IsString()
  @IsOptional()
  obsDeclaracionSociosNoInhabilitados?: string;

  @ApiPropertyOptional({
    description:
      '¿Consignó Declaración de no tener deudas con el ente? (declaracion_no_deudas_ente_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  declaracionNoDeudas?: boolean;

  @ApiPropertyOptional({ description: 'Observación (obs_declaracion_no_deudas_ente_au_au)' })
  @IsString()
  @IsOptional()
  obsDeclaracionNoDeudas?: string;

  @ApiPropertyOptional({
    description:
      '¿Consignó Declaración de no tener impedimentos LCP? (declaracion_no_impedimentos_lcp_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  declaracionNoImpedimentosLcp?: boolean;

  @ApiPropertyOptional({ description: 'Observación (obs_declaracion_no_impedimentos_lcp_au_au)' })
  @IsString()
  @IsOptional()
  obsDeclaracionNoImpedimentosLcp?: string;

  @ApiPropertyOptional({
    description:
      '¿Consignó Declaración de información financiera? (declaracion_info_financiera_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  declaracionInfoFinanciera?: boolean;

  @ApiPropertyOptional({ description: 'Observación (obs_declaracion_info_financiera_au_au)' })
  @IsString()
  @IsOptional()
  obsDeclaracionInfoFinanciera?: string;

  @ApiPropertyOptional({
    description: '¿Consignó relación de servicios prestados? (relacion_servicios_prestados_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  relacionServiciosPrestados?: boolean;

  @ApiPropertyOptional({ description: 'Observación (obs_relacion_servicios_prestados_au_au)' })
  @IsString()
  @IsOptional()
  obsRelacionServiciosPrestados?: string;

  @ApiPropertyOptional({
    description: '¿Consignó referencias comerciales? (referencias_comerciales_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  referenciasComerciales?: boolean;

  @ApiPropertyOptional({ description: 'Observación (obs_referencias_comerciales_au_au)' })
  @IsString()
  @IsOptional()
  obsReferenciasComerciales?: string;
}
