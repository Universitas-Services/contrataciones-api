import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('🔓 Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Endpoint público para autenticación de todos los roles del sistema. Retorna un JWT token que debe usarse en los demás endpoints.',
  })
  @ApiBody({
    type: LoginDto,
    examples: {
      universitas: {
        summary: 'Login como UNIVERSITAS',
        value: {
          email: 'admin@universitas.gob.ve',
          password: 'universitas123',
        },
      },
      supervisor: {
        summary: 'Login como SUPERVISOR',
        value: {
          email: 'supervisor@sistema.gob.ve',
          password: 'supervisor123',
        },
      },
      adminEnte: {
        summary: 'Login como ADMIN_ENTE',
        value: {
          email: 'admin@alcaldia.gob.ve',
          password: 'alcaldia123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'uuid',
          email: 'admin@universitas.gob.ve',
          rol: 'UNIVERSITAS',
          nombre: 'Administrador',
          apellido: 'Sistema',
          enteId: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas o usuario inactivo',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Cambiar contraseña',
    description: 'Permite al usuario autenticado cambiar su contraseña.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada correctamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado o contraseña actual incorrecta',
  })
  changePassword(@Body() changePasswordDto: ChangePasswordDto, @CurrentUser() user: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
    return this.authService.changePassword(user.id, changePasswordDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar recuperación de contraseña',
    description:
      'Envía un correo electrónico con un enlace para restablecer la contraseña. El enlace expira en 1 hora. Por seguridad, siempre retorna un mensaje genérico independientemente de si el email existe.',
  })
  @ApiBody({
    type: ForgotPasswordDto,
    examples: {
      ejemplo: {
        summary: 'Solicitar reset de contraseña',
        value: {
          email: 'usuario@ejemplo.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud procesada',
    schema: {
      example: {
        message:
          'Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.',
      },
    },
  })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restablecer contraseña con token',
    description:
      'Restablece la contraseña del usuario usando el token recibido por correo electrónico. El token tiene una validez de 1 hora.',
  })
  @ApiBody({
    type: ResetPasswordDto,
    examples: {
      ejemplo: {
        summary: 'Restablecer contraseña',
        value: {
          token: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          newPassword: 'NuevaContraseña123!',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña restablecida correctamente',
    schema: {
      example: {
        message: 'Contraseña restablecida correctamente',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Token inválido o expirado',
  })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
