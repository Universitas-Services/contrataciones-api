import { Module } from '@nestjs/common';
import { ManualesController } from './manuales.controller';
import { ManualesService } from './manuales.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [ManualesController],
  providers: [ManualesService],
  exports: [ManualesService],
})
export class ManualesModule {}
