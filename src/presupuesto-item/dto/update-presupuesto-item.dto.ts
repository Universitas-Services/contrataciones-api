import { PartialType } from '@nestjs/mapped-types';
import { CreatePresupuestoItemDto } from './create-presupuesto-item.dto';

export class UpdatePresupuestoItemDto extends PartialType(CreatePresupuestoItemDto) {}
