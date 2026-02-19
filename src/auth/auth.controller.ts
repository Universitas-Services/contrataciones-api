import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';

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
}
