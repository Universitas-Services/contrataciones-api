import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Buscar usuario (incluye Universitas)
    const user = await this.prisma.usuario.findUnique({
      where: { email, deletedAt: null },
      include: { ente: true },
    });

    // Si no es usuario regular, buscar en Universitas
    if (!user) {
      const universitas = await this.prisma.universitas.findUnique({
        where: { email },
      });

      if (universitas && (await bcrypt.compare(password, universitas.passwordHash))) {
        const payload = {
          sub: universitas.id,
          email: universitas.email,
          rol: 'UNIVERSITAS',
        };

        return {
          access_token: this.jwtService.sign(payload),
          user: {
            id: universitas.id,
            nombre: universitas.nombre,
            email: universitas.email,
            rol: 'UNIVERSITAS',
          },
        };
      }

      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Verificar si el Ente ha sido eliminado (Borrado Pasivo de usuarios)
    if (user.ente && user.ente.deletedAt) {
      throw new UnauthorizedException('El Ente al que pertenece este usuario ha sido desactivado');
    }

    // Generar JWT
    const payload = {
      sub: user.id,
      email: user.email,
      rol: user.rol,
      enteId: user.enteId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        rol: user.rol,
        cambioPasswordDefault: user.cambioPasswordDefault,
        ente: user.ente,
      },
    };
  }

  async validateUser(payload: { sub: string; rol?: string; email: string; enteId?: string }) {
    if (payload.rol === 'UNIVERSITAS') {
      return this.prisma.universitas.findUnique({
        where: { id: payload.sub },
      });
    }

    return this.prisma.usuario.findUnique({
      where: { id: payload.sub, deletedAt: null },
      include: { ente: true },
    });
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    // 1. Buscar Usuario normal
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (user) {
      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('La contraseña actual es incorrecta');
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      await this.prisma.usuario.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash, cambioPasswordDefault: true },
      });

      return { message: 'Contraseña actualizada correctamente' };
    }

    // 2. Si no es usuario, buscar Universitas
    const universitas = await this.prisma.universitas.findUnique({
      where: { id: userId },
    });

    if (universitas) {
      const isPasswordValid = await bcrypt.compare(currentPassword, universitas.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('La contraseña actual es incorrecta');
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      await this.prisma.universitas.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });

      return { message: 'Contraseña actualizada correctamente' };
    }

    throw new UnauthorizedException('Usuario no encontrado');
  }
}
