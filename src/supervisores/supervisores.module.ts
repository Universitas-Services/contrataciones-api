import { Module } from '@nestjs/common';
import { SupervisoresController } from './supervisores.controller';
import { SupervisoresService } from './supervisores.service';
import { EntesModule } from '../entes/entes.module';

@Module({
  imports: [EntesModule],
  controllers: [SupervisoresController],
  providers: [SupervisoresService],
  exports: [SupervisoresService],
})
export class SupervisoresModule {}
