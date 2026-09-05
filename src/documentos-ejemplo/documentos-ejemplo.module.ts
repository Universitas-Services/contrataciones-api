import { Module } from '@nestjs/common';
import { DocumentosEjemploService } from './documentos-ejemplo.service';
import { DocumentosEjemploController } from './documentos-ejemplo.controller';
import { PrismaModule } from '../database/prisma.module';

/**
 * Documentos de ejemplo: guías visuales que carga UNIVERSITAS y los entes
 * consultan mientras llenan los formularios.
 */
@Module({
  imports: [PrismaModule],
  providers: [DocumentosEjemploService],
  controllers: [DocumentosEjemploController],
  exports: [DocumentosEjemploService],
})
export class DocumentosEjemploModule {}
