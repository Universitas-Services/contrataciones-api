import { Module, Global } from '@nestjs/common';
import { ExpedienteAccessService } from './services/expediente-access.service';

@Global()
@Module({
  providers: [ExpedienteAccessService],
  exports: [ExpedienteAccessService],
})
export class CommonModule {}
