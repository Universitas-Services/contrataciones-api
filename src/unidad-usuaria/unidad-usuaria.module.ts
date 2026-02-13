import { Module } from '@nestjs/common';
import { UnidadUsuariaService } from './unidad-usuaria.service';
import { UnidadUsuariaController } from './unidad-usuaria.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UnidadUsuariaController],
  providers: [UnidadUsuariaService],
})
export class UnidadUsuariaModule {}
