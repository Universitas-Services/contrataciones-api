import { Module } from '@nestjs/common';
import { OfertaPresentadaService } from './oferta-presentada.service';
import { OfertaPresentadaController } from './oferta-presentada.controller';
import { PrismaModule } from '../database/prisma.module';
import { ProveedoresModule } from '../proveedores/proveedores.module';

@Module({
  imports: [PrismaModule, ProveedoresModule],
  controllers: [OfertaPresentadaController],
  providers: [OfertaPresentadaService],
  exports: [OfertaPresentadaService],
})
export class OfertaPresentadaModule {}
