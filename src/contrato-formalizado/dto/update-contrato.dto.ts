import { PartialType } from '@nestjs/swagger';
import { SaveContratoDto } from './save-contrato.dto';

export class UpdateContratoDto extends PartialType(SaveContratoDto) {}
