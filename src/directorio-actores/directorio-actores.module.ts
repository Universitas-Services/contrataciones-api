import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { DirectorioActoresService } from './directorio-actores.service';
import { DirectorioActoresController } from './directorio-actores.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DirectorioActoresController],
  providers: [DirectorioActoresService],
  exports: [DirectorioActoresService],
})
export class DirectorioActoresModule {}
