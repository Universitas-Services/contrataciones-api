import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
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

  /**
   * Solicitar recuperación de contraseña.
   * Genera un token único, lo guarda en BD con expiración de 1 hora,
   * y envía un correo con el enlace de reset.
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Buscar usuario por email
    const user = await this.prisma.usuario.findUnique({
      where: { email, deletedAt: null },
    });

    // Siempre retornar mensaje genérico (no revelar si el email existe)
    if (!user) {
      return {
        message:
          'Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.',
      };
    }

    // Generar token único
    const resetToken = crypto.randomUUID();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Guardar token en BD
    await this.prisma.usuario.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });

    // Construir enlace de reset
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Enviar correo
    try {
      await this.emailService.sendPasswordResetEmail(user.email, user.nombre, resetLink);
    } catch {
      // Log ya manejado en EmailService, no bloquear la respuesta
    }

    return {
      message:
        'Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.',
    };
  }

  /**
   * Restablecer la contraseña usando el token recibido por email.
   * Valida que el token exista y no haya expirado.
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    // Buscar usuario por token
    const user = await this.prisma.usuario.findUnique({
      where: { resetPasswordToken: token },
    });

    if (!user) {
      throw new BadRequestException('Token inválido o expirado');
    }

    // Verificar que no haya expirado
    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      // Limpiar token expirado
      await this.prisma.usuario.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      });
      throw new BadRequestException('Token inválido o expirado');
    }

    // Hashear nueva contraseña y limpiar token
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.usuario.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        cambioPasswordDefault: true,
      },
    });

    return { message: 'Contraseña restablecida correctamente' };
  }
}
