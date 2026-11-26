import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthService } from '../auth.service';
import { tokenPermitido } from '../token-subida';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: any) {
    const ruta = (req.route as { path?: string } | undefined)?.path ?? '';
    if (!tokenPermitido(payload.alcance, req.method, ruta)) {
      throw new UnauthorizedException('Este token solo sirve para subir archivos.');
    }
    return {
      id: payload.sub,
      email: payload.email,
      rol: payload.rol,
      enteId: payload.enteId,
    };
  }
}
