import { Module } from '@nestjs/common';
import { AdjudicacionService } from './adjudicacion.service';
import { AdjudicacionController } from './adjudicacion.controller';

@Module({
  controllers: [AdjudicacionController],
  providers: [AdjudicacionService],
  exports: [AdjudicacionService],
})
export class AdjudicacionModule {}
