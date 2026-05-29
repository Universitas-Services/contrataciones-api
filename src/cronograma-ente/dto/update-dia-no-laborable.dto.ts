import { PartialType } from '@nestjs/mapped-types';
import { CreateDiaNoLaborableDto } from './create-dia-no-laborable.dto';

export class UpdateDiaNoLaborableDto extends PartialType(CreateDiaNoLaborableDto) {}
