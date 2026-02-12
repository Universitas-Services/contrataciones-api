import { PartialType } from '@nestjs/swagger';
import { CreateMaximaAutoridadDto } from './create-maxima-autoridad.dto';

export class UpdateMaximaAutoridadDto extends PartialType(CreateMaximaAutoridadDto) {}
