import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { EntesService } from '../entes/entes.service';

/**
 * Punto 39: «debe cambiar la contraseña» es
 * `cambioPasswordDefault === false || passwordPerdido === true`, para todos los roles.
 * Estas pruebas fijan cómo queda cada marca en cada camino.
 */
describe('Contraseña temporal (39)', () => {
  const marcas = (update: jest.Mock) => {
    const { cambioPasswordDefault, passwordPerdido } = update.mock.calls[0][0].data;
    return { cambioPasswordDefault, passwordPerdido };
  };

  function auth(usuario: object | null) {
    const prisma = {
      usuario: {
        findUnique: jest.fn().mockResolvedValue(usuario),
        update: jest.fn().mockResolvedValue({}),
      },
      universitas: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const email = { sendPasswordChangedByAdminEmail: jest.fn().mockResolvedValue(undefined) };
    return {
      s: new AuthService(prisma as never, {} as never, email as never, {} as never),
      prisma,
    };
  }

  it.each(['EJECUTOR', 'VISUALIZADOR'])(
    '%s cambia su propia contraseña: queda como cambiada y sin reasignación',
    async (rol) => {
      const { s, prisma } = auth({
        id: 'u',
        rol,
        passwordHash: await bcrypt.hash('Temporal1*', 10),
        cambioPasswordDefault: false,
        passwordPerdido: true,
      });
      const r = await s.changePassword('u', {
        currentPassword: 'Temporal1*',
        newPassword: 'Nueva12*',
      });
      expect(r.message).toBe('Contraseña actualizada correctamente');
      expect(marcas(prisma.usuario.update)).toEqual({
        cambioPasswordDefault: true,
        passwordPerdido: false,
      });
    },
  );

  it('con la contraseña temporal equivocada no cambia nada', async () => {
    const { s, prisma } = auth({
      id: 'u',
      rol: 'EJECUTOR',
      passwordHash: await bcrypt.hash('a', 10),
    });
    await expect(
      s.changePassword('u', { currentPassword: 'b', newPassword: 'Nueva12*' }),
    ).rejects.toThrow('La contraseña actual es incorrecta');
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('restablecer por correo quita la marca de reasignada', async () => {
    const { s, prisma } = auth({
      id: 'u',
      resetPasswordToken: 't',
      resetPasswordExpires: new Date(Date.now() + 60_000),
    });
    await s.resetPassword({ token: 't', newPassword: 'Nueva12*' } as never);
    expect(marcas(prisma.usuario.update)).toEqual({
      cambioPasswordDefault: true,
      passwordPerdido: false,
    });
  });

  it('el admin pone la contraseña al editar el usuario: queda reasignada', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      usuario: { findFirst: jest.fn().mockResolvedValue({ id: 'u' }), update },
    };
    const entes = new EntesService(prisma as never, {} as never);
    await entes.updateUsuarioEnte('e', 'u', { password: 'Temporal1*' } as never);
    expect(marcas(update)).toEqual({ cambioPasswordDefault: true, passwordPerdido: true });
    expect(update.mock.calls[0][0].data.password).toBeUndefined();
  });

  it('editar el usuario sin contraseña no toca las marcas', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      usuario: { findFirst: jest.fn().mockResolvedValue({ id: 'u' }), update },
    };
    const entes = new EntesService(prisma as never, {} as never);
    await entes.updateUsuarioEnte('e', 'u', { nombre: 'Ana' } as never);
    expect(marcas(update)).toEqual({
      cambioPasswordDefault: undefined,
      passwordPerdido: undefined,
    });
  });
});
