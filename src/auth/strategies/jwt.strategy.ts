import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth.service';
import { tokenPermitido } from '../token-subida';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
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
