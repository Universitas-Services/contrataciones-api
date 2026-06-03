import { Module } from '@nestjs/common';
import { EntesService } from './entes.service';
import { EntesController } from './entes.controller';
import { ManualesModule } from '../manuales/manuales.module';

@Module({
  imports: [ManualesModule],
  controllers: [EntesController],
  providers: [EntesService],
  exports: [EntesService],
})
export class EntesModule {}
