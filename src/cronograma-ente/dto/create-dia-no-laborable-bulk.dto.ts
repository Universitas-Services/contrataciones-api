import { ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateDiaNoLaborableDto } from './create-dia-no-laborable.dto';

export class CreateDiaNoLaborableBulkDto {
  @ValidateNested({ each: true })
  @Type(() => CreateDiaNoLaborableDto)
  @ArrayMinSize(1)
  dias: CreateDiaNoLaborableDto[];
}
