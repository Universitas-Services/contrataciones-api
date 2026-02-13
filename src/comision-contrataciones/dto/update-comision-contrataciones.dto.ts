import { PartialType } from '@nestjs/swagger';
import { CreateComisionContratacionesDto } from './create-comision-contrataciones.dto';

export class UpdateComisionContratacionesDto extends PartialType(CreateComisionContratacionesDto) {}
