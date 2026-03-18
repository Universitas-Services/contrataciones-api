import { Test, TestingModule } from '@nestjs/testing';
import { SupervisoresService } from './supervisores.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('SupervisoresService', () => {
  let service: SupervisoresService;

  // Mock transaction callback - executes the callback with the mock prisma
  const mockTransaction = jest.fn((cb) => cb(mockPrismaService));

  const mockPrismaService = {
    supervisor: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    usuario: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    entePublico: {
      findMany: jest.fn(),
    },
    supervisorAsignacion: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: mockTransaction,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SupervisoresService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<SupervisoresService>(SupervisoresService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('debe retornar todos los supervisores con conteo de Entes', async () => {
      const mockSupervisores = [
        {
          id: 'supervisor-1',
          nombre: 'Carlos',
          apellido: 'Ramírez',
          email: 'carlos@test.com',
          activo: true,
          createdAt: new Date(),
          _count: { entesAsignados: 3 },
        },
        {
          id: 'supervisor-2',
          nombre: 'María',
          apellido: 'González',
          email: 'maria@test.com',
          activo: true,
          createdAt: new Date(),
          _count: { entesAsignados: 1 },
        },
      ];

      mockPrismaService.usuario.findMany.mockResolvedValue(mockSupervisores);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('cantidadEntesAsignados');
      expect(result[0].cantidadEntesAsignados).toBe(3);
      expect(mockPrismaService.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            rol: 'SUPERVISOR',
            deletedAt: null,
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('debe retornar supervisor con sus Entes asignados', async () => {
      const mockSupervisor = {
        id: 'supervisor-uuid',
        nombre: 'Carlos',
        apellido: 'Ramírez',
        email: 'carlos@test.com',
        activo: true,
        rol: 'SUPERVISOR',
        entesAsignados: [
          {
            createdAt: new Date(),
            ente: {
              id: 'ente-1',
              nombre: 'Alcaldía A',
              siglas: 'AA',
              rif: 'G-123',
            },
          },
        ],
      };

      mockPrismaService.usuario.findFirst.mockResolvedValue(mockSupervisor);

      const result = await service.findOne('supervisor-uuid');

      expect(result.id).toBe('supervisor-uuid');
      expect(result).toHaveProperty('entesAsignados');
      expect(mockPrismaService.usuario.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'supervisor-uuid',
            rol: 'SUPERVISOR',
          }),
        }),
      );
    });

    it('debe lanzar NotFoundException si supervisor no existe', async () => {
      mockPrismaService.usuario.findFirst.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid-id')).rejects.toThrow('Supervisor no encontrado');
    });
  });

  describe('remove', () => {
    it('debe hacer soft delete del supervisor', async () => {
      const mockSupervisor = {
        id: 'supervisor-uuid',
        rol: 'SUPERVISOR',
        deletedAt: null,
      };

      mockPrismaService.usuario.findFirst.mockResolvedValue(mockSupervisor);
      mockPrismaService.usuario.update.mockResolvedValue({
        ...mockSupervisor,
        activo: false,
        deletedAt: new Date(),
      });

      const result = await service.remove('supervisor-uuid');

      expect(result).toHaveProperty('message', 'Supervisor eliminado correctamente');
      expect(result).toHaveProperty('id', 'supervisor-uuid');
      expect(mockPrismaService.usuario.update).toHaveBeenCalledWith({
        where: { id: 'supervisor-uuid' },
        data: {
          deletedAt: expect.any(Date),
          activo: false,
        },
      });
    });

    it('debe lanzar NotFoundException si supervisor no existe', async () => {
      mockPrismaService.usuario.findFirst.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
