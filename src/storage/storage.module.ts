import { Module, Global } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

@Global()
@Module({
  providers: [
    CloudinaryService,
    {
      provide: 'IStorageService',
      useClass: CloudinaryService, // Inyección de dependencia para desacoplamiento
    },
  ],
  exports: ['IStorageService', CloudinaryService],
})
export class StorageModule { }
