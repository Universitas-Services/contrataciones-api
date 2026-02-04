import { Module } from '@nestjs/common';
import { ManualesController } from './manuales.controller';
import { ManualesService } from './manuales.service';

@Module({
    controllers: [ManualesController],
    providers: [ManualesService],
    exports: [ManualesService],
})
export class ManualesModule { }
