import { PartialType } from '@nestjs/swagger';
import { CreatePresupuestoItemDto } from './create-presupuesto-item.dto';

export class UpdatePresupuestoItemDto extends PartialType(CreatePresupuestoItemDto) {}
