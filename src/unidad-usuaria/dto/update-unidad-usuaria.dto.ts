import { PartialType } from '@nestjs/swagger';
import { CreateUnidadUsuariaDto } from './create-unidad-usuaria.dto';

export class UpdateUnidadUsuariaDto extends PartialType(CreateUnidadUsuariaDto) {}
