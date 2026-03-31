import { PartialType } from '@nestjs/mapped-types';
import { CreateFasePreparatoriaDto } from './create-fase-preparatoria.dto';

export class UpdateFasePreparatoriaDto extends PartialType(CreateFasePreparatoriaDto) {}
