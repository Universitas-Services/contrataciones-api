import { Module } from '@nestjs/common';
import { NormativaGlobalService } from './normativa-global.service';
import { NormativaGlobalController } from './normativa-global.controller';
import { NormativaEnteService } from './normativa-ente.service';
import { NormativaEnteController } from './normativa-ente.controller';
import { ClausulasGenericasService } from './clausulas-genericas.service';
import { ClausulasGenericasController } from './clausulas-genericas.controller';
import { ClausulasEnteService } from './clausulas-ente.service';
import { ClausulasEnteController } from './clausulas-ente.controller';
import { TokensService } from './tokens.service';
import { TokensController } from './tokens.controller';
import { PrismaModule } from '../database/prisma.module';

/**
 * Bibliotecas de consulta, en dos niveles:
 *
 *   UNIVERSITAS  → normativa global y cláusulas genéricas (para todos los entes)
 *   Ente         → normativa y cláusulas propias de cada ente
 */
@Module({
  imports: [PrismaModule],
  providers: [
    NormativaGlobalService,
    NormativaEnteService,
    ClausulasGenericasService,
    ClausulasEnteService,
    TokensService,
  ],
  controllers: [
    NormativaGlobalController,
    NormativaEnteController,
    ClausulasGenericasController,
    ClausulasEnteController,
    TokensController,
  ],
  exports: [
    NormativaGlobalService,
    NormativaEnteService,
    ClausulasGenericasService,
    ClausulasEnteService,
    TokensService,
  ],
})
export class BibliotecaModule {}
