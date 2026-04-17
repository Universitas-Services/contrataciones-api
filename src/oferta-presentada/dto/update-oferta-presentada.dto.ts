import { PartialType } from '@nestjs/swagger';
import { CreateOfertaPresentadaDto } from './create-oferta-presentada.dto';

export class UpdateOfertaPresentadaDto extends PartialType(CreateOfertaPresentadaDto) {}
