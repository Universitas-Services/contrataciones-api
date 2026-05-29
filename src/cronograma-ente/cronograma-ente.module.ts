import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { CronogramaEnteController } from './cronograma-ente.controller';
import { CronogramaEnteService } from './cronograma-ente.service';

@Module({
  imports: [PrismaModule],
  controllers: [CronogramaEnteController],
  providers: [CronogramaEnteService],
  exports: [CronogramaEnteService],
})
export class CronogramaEnteModule {}
