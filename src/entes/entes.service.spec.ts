import { Test, TestingModule } from '@nestjs/testing';
import { EntesService } from './entes.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('EntesService', () => {
  let service: EntesService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    entePublico: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    usuario: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    supervisorAsignacion: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EntesService>(EntesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('debe retornar todos los Entes para UNIVERSITAS', async () => {
      const mockUser = { id: 'user-id', rol: 'UNIVERSITAS', enteId: null };
      const mockEntes = [
        { id: 'ente-1', nombre: 'Alcaldía A', siglas: 'AA', rif: 'G-123' },
        { id: 'ente-2', nombre: 'Ministerio B', siglas: 'MB', rif: 'G-456' },
      ];

      mockPrismaService.entePublico.findMany.mockResolvedValue(mockEntes);

      const result = await service.findAll(mockUser);

      expect(result).toEqual(mockEntes);
      expect(mockPrismaService.entePublico.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        select: expect.any(Object),
      });
    });

    it('debe retornar solo Entes asignados para SUPERVISOR', async () => {
      const mockUser = { id: 'supervisor-id', rol: 'SUPERVISOR', enteId: null };
      const mockAsignaciones = [{ enteId: 'ente-1' }, { enteId: 'ente-2' }];
      const mockEntes = [
        { id: 'ente-1', nombre: 'Alcaldía A' },
        { id: 'ente-2', nombre: 'Ministerio B' },
      ];

      mockPrismaService.supervisorAsignacion.findMany.mockResolvedValue(
        mockAsignaciones,
      );
      mockPrismaService.entePublico.findMany.mockResolvedValue(mockEntes);

      const result = await service.findAll(mockUser);

      expect(result).toEqual(mockEntes);
      expect(
        mockPrismaService.supervisorAsignacion.findMany,
      ).toHaveBeenCalledWith({
        where: { supervisorId: mockUser.id },
        select: { enteId: true },
      });
    });

    it('debe retornar solo su Ente para roles de Ente (ADMIN_ENTE, EJECUTOR)', async () => {
      const mockUser = { id: 'user-id', rol: 'ADMIN_ENTE', enteId: 'ente-1' };
      const mockEntes = [{ id: 'ente-1', nombre: 'Mi Ente' }];

      mockPrismaService.entePublico.findMany.mockResolvedValue(mockEntes);

      const result = await service.findAll(mockUser);

      expect(result).toEqual(mockEntes);
      expect(mockPrismaService.entePublico.findMany).toHaveBeenCalledWith({
        where: {
          id: mockUser.enteId,
          deletedAt: null,
        },
        select: expect.any(Object),
      });
    });
  });

  describe('findOne', () => {
    it('debe retornar un Ente por ID', async () => {
      const mockEnte = {
        id: 'ente-uuid',
        nombre: 'Alcaldía Test',
        siglas: 'AT',
        rif: 'G-20001234-5',
      };

      mockPrismaService.entePublico.findUnique.mockResolvedValue(mockEnte);

      const result = await service.findOne('ente-uuid');

      expect(result).toEqual(mockEnte);
      expect(mockPrismaService.entePublico.findUnique).toHaveBeenCalledWith({
        where: { id: 'ente-uuid' },
        include: expect.any(Object),
      });
    });

    it('debe lanzar NotFoundException si Ente no existe', async () => {
      mockPrismaService.entePublico.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        'Ente no encontrado',
      );
    });
  });

  describe('remove', () => {
    it('debe hacer soft delete del Ente', async () => {
      const mockEnte = {
        id: 'ente-uuid',
        nombre: 'Ente a eliminar',
        deletedAt: null,
      };

      const mockUpdatedEnte = {
        ...mockEnte,
        deletedAt: new Date(),
      };

      mockPrismaService.entePublico.findUnique.mockResolvedValue(mockEnte);
      mockPrismaService.entePublico.update.mockResolvedValue(mockUpdatedEnte);

      const result = await service.remove('ente-uuid', 'user-id');

      expect(result.deletedAt).not.toBeNull();
      expect(mockPrismaService.entePublico.update).toHaveBeenCalledWith({
        where: { id: 'ente-uuid' },
        data: {
          deletedAt: expect.any(Date),
          updatedBy: 'user-id',
        },
      });
    });

    it('debe lanzar NotFoundException si Ente no existe', async () => {
      mockPrismaService.entePublico.findUnique.mockResolvedValue(null);

      await expect(service.remove('invalid-id', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
