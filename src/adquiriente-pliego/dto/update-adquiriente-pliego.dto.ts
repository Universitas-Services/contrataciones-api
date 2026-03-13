import { PartialType } from '@nestjs/swagger';
import { CreateAdquirentePliegoDto } from './create-adquiriente-pliego.dto';

export class UpdateAdquirentePliegoDto extends PartialType(CreateAdquirentePliegoDto) {}
