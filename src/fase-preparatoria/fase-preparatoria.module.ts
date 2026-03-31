import { Module } from '@nestjs/common';
import { FasePreparatoriaService } from './fase-preparatoria.service';
import { FasePreparatoriaController } from './fase-preparatoria.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FasePreparatoriaService],
  controllers: [FasePreparatoriaController],
})
export class FasePreparatoriaModule {}
