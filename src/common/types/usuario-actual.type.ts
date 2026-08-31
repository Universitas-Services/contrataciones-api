import { RolUsuario } from '@prisma/client';

/** Forma del usuario autenticado que expone el decorador @CurrentUser(). */
export interface UsuarioActual {
  id: string;
  enteId: string;
  rol: RolUsuario;
}
