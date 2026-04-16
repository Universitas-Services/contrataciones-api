import { Module } from '@nestjs/common';
import { GeneradorDocumentosService } from './generador-documentos.service';
import { GeneradorDocumentosController } from './generador-documentos.controller';
import { EmailModule } from '../email/email.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [EmailModule, StorageModule],
  controllers: [GeneradorDocumentosController],
  providers: [GeneradorDocumentosService],
  exports: [GeneradorDocumentosService],
})
export class GeneradorDocumentosModule {}
