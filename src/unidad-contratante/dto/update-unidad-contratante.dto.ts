import { PartialType } from '@nestjs/swagger';
import { CreateUnidadContratanteDto } from './create-unidad-contratante.dto';

export class UpdateUnidadContratanteDto extends PartialType(CreateUnidadContratanteDto) {}
