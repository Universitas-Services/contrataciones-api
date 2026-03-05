import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    usuario: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    universitas: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EmailService, useValue: { sendPasswordResetEmail: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('debe retornar access_token cuando credenciales son válidas', async () => {
      const loginDto = {
        email: 'test@test.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-uuid',
        email: loginDto.email,
        passwordHash: await bcrypt.hash(loginDto.password, 10),
        rol: 'ADMIN_ENTE',
        activo: true,
        nombre: 'Administrador',
        apellido: 'Sistema',
        enteId: 'ente-uuid',
        ente: { id: 'ente-uuid', nombre: 'Test Ente', deletedAt: null },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        rol: mockUser.rol,
        nombre: mockUser.nombre,
        apellido: mockUser.apellido,
      });
      expect(mockPrismaService.usuario.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email, deletedAt: null },
        include: { ente: true },
      });
    });

    it('debe lanzar UnauthorizedException si email no existe', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      mockPrismaService.universitas.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'noexiste@test.com',
          password: 'password',
        }),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.login({
          email: 'noexiste@test.com',
          password: 'password',
        }),
      ).rejects.toThrow('Credenciales inválidas');
    });

    it('debe lanzar UnauthorizedException si password es incorrecta', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@test.com',
        passwordHash: await bcrypt.hash('correctpassword', 10),
        rol: 'ADMIN_ENTE',
        activo: true,
        nombre: 'Test',
        apellido: 'User',
        enteId: 'ente-uuid',
        ente: { id: 'ente-uuid', nombre: 'Test Ente', deletedAt: null },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.login({
          email: 'test@test.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si usuario está inactivo', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@test.com',
        passwordHash: await bcrypt.hash('password', 10),
        rol: 'ADMIN_ENTE',
        activo: false,
        nombre: 'Test',
        apellido: 'User',
        enteId: 'ente-uuid',
        ente: { id: 'ente-uuid', nombre: 'Test Ente', deletedAt: null },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.login({
          email: 'test@test.com',
          password: 'password',
        }),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.login({
          email: 'test@test.com',
          password: 'password',
        }),
      ).rejects.toThrow('Usuario inactivo');
    });

    it('debe incluir JWT payload con userId, email, rol y enteId', async () => {
      const loginDto = {
        email: 'test@test.com',
        password: 'password',
      };

      const mockUser = {
        id: 'user-uuid',
        email: loginDto.email,
        passwordHash: await bcrypt.hash(loginDto.password, 10),
        rol: 'EJECUTOR',
        activo: true,
        nombre: 'Test',
        apellido: 'User',
        enteId: 'ente-uuid',
        ente: { id: 'ente-uuid', nombre: 'Test Ente', deletedAt: null },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('token');

      await service.login(loginDto);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        rol: mockUser.rol,
        enteId: mockUser.enteId,
      });
    });
  });
});
