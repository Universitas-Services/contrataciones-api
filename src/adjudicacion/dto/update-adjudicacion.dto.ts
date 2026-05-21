import { PartialType } from '@nestjs/swagger';
import { CreateAdjudicacionDto } from './create-adjudicacion.dto';

export class UpdateAdjudicacionDto extends PartialType(CreateAdjudicacionDto) {}
