import { PartialType } from '@nestjs/swagger';
import { CreateExpedienteDraftDto } from './create-expediente-draft.dto';

export class UpdateExpedienteDraftDto extends PartialType(CreateExpedienteDraftDto) {}
