import { Module } from '@nestjs/common';
import { UnidadContratanteService } from './unidad-contratante.service';
import { UnidadContratanteController } from './unidad-contratante.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UnidadContratanteController],
  providers: [UnidadContratanteService],
})
export class UnidadContratanteModule {}
