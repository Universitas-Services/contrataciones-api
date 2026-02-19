import { ValidateNested, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateModalidadContratacionDto } from '../../modalidad-contratacion/dto/create-modalidad-contratacion.dto';
import { CreateExpedienteContratacionDto } from './create-expediente.dto';
import { CreateCronogramaExpedienteDto } from '../../cronograma-expediente/dto/create-cronograma-expediente.dto';

export class CreateProcesoCompletoDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateModalidadContratacionDto)
  modalidad: CreateModalidadContratacionDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => CreateExpedienteContratacionDto)
  expediente: CreateExpedienteContratacionDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => CreateCronogramaExpedienteDto)
  cronograma: CreateCronogramaExpedienteDto;
}
