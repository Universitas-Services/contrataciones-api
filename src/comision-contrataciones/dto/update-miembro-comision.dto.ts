import { PartialType } from '@nestjs/swagger';
import { CreateMiembroComisionDto } from './create-miembro-comision.dto';

export class UpdateMiembroComisionDto extends PartialType(CreateMiembroComisionDto) {}
