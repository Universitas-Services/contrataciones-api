import { Module } from '@nestjs/common';
import { AdquirentePliegoController } from './adquiriente-pliego.controller';
import { AdquirentePliegoService } from './adquiriente-pliego.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [AdquirentePliegoController],
  providers: [AdquirentePliegoService],
  exports: [AdquirentePliegoService],
})
export class AdquirentePliegoModule {}
