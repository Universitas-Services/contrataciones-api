/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { EntesService } from './entes.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('EntesService', () => {
  let service: EntesService;

  const mockPrismaService = {
    entePublico: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
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
      providers: [EntesService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<EntesService>(EntesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('debe retornar todos los Entes para UNIVERSITAS', async () => {
      const mockUser = { id: 'user-id', rol: 'UNIVERSITAS', enteId: undefined };
      const mockEntes = [
        { id: 'ente-1', nombre: 'Alcaldía A', siglas: 'AA', rif: 'G-123' },
        { id: 'ente-2', nombre: 'Ministerio B', siglas: 'MB', rif: 'G-456' },
      ];

      mockPrismaService.entePublico.findMany.mockResolvedValue(mockEntes);

      const result = await service.findAll(mockUser);

      expect(result).toEqual(mockEntes);
      expect(mockPrismaService.entePublico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
        }),
      );
    });

    it('debe retornar solo Entes asignados para SUPERVISOR', async () => {
      const mockUser = { id: 'supervisor-id', rol: 'SUPERVISOR', enteId: undefined };
      const mockAsignaciones = [{ enteId: 'ente-1' }, { enteId: 'ente-2' }];
      const mockEntes = [
        { id: 'ente-1', nombre: 'Alcaldía A' },
        { id: 'ente-2', nombre: 'Ministerio B' },
      ];

      mockPrismaService.supervisorAsignacion.findMany.mockResolvedValue(mockAsignaciones);
      mockPrismaService.entePublico.findMany.mockResolvedValue(mockEntes);

      const result = await service.findAll(mockUser);

      expect(result).toEqual(mockEntes);
      expect(mockPrismaService.supervisorAsignacion.findMany).toHaveBeenCalledWith({
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
      expect(mockPrismaService.entePublico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: mockUser.enteId,
            deletedAt: null,
          }),
        }),
      );
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

      mockPrismaService.entePublico.findFirst.mockResolvedValue(mockEnte);

      const result = await service.findOne('ente-uuid');

      expect(result).toEqual(mockEnte);
      expect(mockPrismaService.entePublico.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ente-uuid', deletedAt: null },
        }),
      );
    });

    it('debe lanzar NotFoundException si Ente no existe', async () => {
      mockPrismaService.entePublico.findFirst.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('debe hacer soft delete del Ente', async () => {
      const mockUpdatedEnte = {
        id: 'ente-uuid',
        nombre: 'Ente a eliminar',
        deletedAt: new Date(),
      };

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
  });
});
