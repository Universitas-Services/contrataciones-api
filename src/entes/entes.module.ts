import { Module } from '@nestjs/common';
import { EntesService } from './entes.service';
import { EntesController } from './entes.controller';

@Module({
  controllers: [EntesController],
  providers: [EntesService],
  exports: [EntesService],
})
export class EntesModule {}
