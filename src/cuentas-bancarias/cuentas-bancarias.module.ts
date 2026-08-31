import { Module } from '@nestjs/common';
import { CuentasBancariasService } from './cuentas-bancarias.service';
import { CuentasBancariasController } from './cuentas-bancarias.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CuentasBancariasService],
  controllers: [CuentasBancariasController],
})
export class CuentasBancariasModule {}
