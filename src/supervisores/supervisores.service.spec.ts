import { Test, TestingModule } from '@nestjs/testing';
import { SupervisoresService } from './supervisores.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('SupervisoresService', () => {
  let service: SupervisoresService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    usuario: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    supervisorAsignacion: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    entePublico: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupervisoresService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SupervisoresService>(SupervisoresService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('debe crear un supervisor con Entes asignados', async () => {
      const createDto = {
        nombre: 'Carlos',
        apellido: 'Ramírez',
        email: 'carlos@supervision.gob.ve',
        password: 'supervisor123',
        entesIds: ['ente-1', 'ente-2'],
      };

      const mockSupervisor = {
        id: 'supervisor-uuid',
        email: createDto.email,
        nombre: createDto.nombre,
        apellido: createDto.apellido,
        rol: 'SUPERVISOR',
        activo: true,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      mockPrismaService.usuario.create.mockResolvedValue(mockSupervisor);
      mockPrismaService.supervisorAsignacion.createMany.mockResolvedValue({
        count: 2,
      });

      const result = await service.create(createDto, 'admin-id');

      expect(result.email).toBe(createDto.email);
      expect(result.rol).toBe('SUPERVISOR');
      expect(mockPrismaService.usuario.create).toHaveBeenCalled();
      expect(
        mockPrismaService.supervisorAsignacion.createMany,
      ).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            enteId: 'ente-1',
            supervisorId: mockSupervisor.id,
          }),
          expect.objectContaining({
            enteId: 'ente-2',
            supervisorId: mockSupervisor.id,
          }),
        ]),
      });
    });

    it('debe lanzar ConflictException si email ya existe', async () => {
      const createDto = {
        nombre: 'Carlos',
        apellido: 'Ramírez',
        email: 'existente@test.com',
        password: 'pass',
        entesIds: ['ente-1'],
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue({
        id: 'existing-user',
      });

      await expect(service.create(createDto, 'admin-id')).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto, 'admin-id')).rejects.toThrow(
        'El email ya está registrado',
      );
    });
  });

  describe('findAll', () => {
    it('debe retornar todos los supervisores con conteo de Entes', async () => {
      const mockSupervisores = [
        {
          id: 'supervisor-1',
          nombre: 'Carlos',
          apellido: 'Ramírez',
          email: 'carlos@test.com',
          rol: 'SUPERVISOR',
          activo: true,
          _count: { entesAsignados: 3 },
        },
        {
          id: 'supervisor-2',
          nombre: 'María',
          apellido: 'González',
          email: 'maria@test.com',
          rol: 'SUPERVISOR',
          activo: true,
          _count: { entesAsignados: 1 },
        },
      ];

      mockPrismaService.usuario.findMany.mockResolvedValue(mockSupervisores);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('cantidadEntesAsignados');
      expect(mockPrismaService.usuario.findMany).toHaveBeenCalledWith({
        where: {
          rol: 'SUPERVISOR',
          deletedAt: null,
        },
        select: expect.any(Object),
      });
    });
  });

  describe('findOne', () => {
    it('debe retornar supervisor con sus Entes asignados', async () => {
      const mockSupervisor = {
        id: 'supervisor-uuid',
        nombre: 'Carlos',
        apellido: 'Ramírez',
        email: 'carlos@test.com',
        rol: 'SUPERVISOR',
        entesAsignados: [
          {
            ente: {
              id: 'ente-1',
              nombre: 'Alcaldía A',
              siglas: 'AA',
            },
          },
        ],
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(mockSupervisor);

      const result = await service.findOne('supervisor-uuid');

      expect(result.id).toBe('supervisor-uuid');
      expect(result).toHaveProperty('entesAsignados');
      expect(mockPrismaService.usuario.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'supervisor-uuid',
          rol: 'SUPERVISOR',
        },
        include: expect.any(Object),
      });
    });

    it('debe lanzar NotFoundException si supervisor no existe', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        'Supervisor no encontrado',
      );
    });
  });

  describe('asignarEntes', () => {
    it('debe agregar y remover Entes correctamente', async () => {
      const dto = {
        agregarEntes: ['ente-3', 'ente-4'],
        removerEntes: ['ente-1'],
      };

      const mockSupervisor = { id: 'supervisor-uuid', rol: 'SUPERVISOR' };

      mockPrismaService.usuario.findUnique.mockResolvedValue(mockSupervisor);
      mockPrismaService.supervisorAsignacion.deleteMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.supervisorAsignacion.createMany.mockResolvedValue({
        count: 2,
      });

      const result = await service.asignarEntes(
        'supervisor-uuid',
        dto,
        'admin-id',
      );

      expect(
        mockPrismaService.supervisorAsignacion.deleteMany,
      ).toHaveBeenCalledWith({
        where: {
          supervisorId: 'supervisor-uuid',
          enteId: { in: dto.removerEntes },
        },
      });
      expect(
        mockPrismaService.supervisorAsignacion.createMany,
      ).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('debe hacer soft delete del supervisor', async () => {
      const mockSupervisor = {
        id: 'supervisor-uuid',
        rol: 'SUPERVISOR',
        deletedAt: null,
      };

      const mockUpdatedSupervisor = {
        ...mockSupervisor,
        activo: false,
        deletedAt: new Date(),
      };

      mockPrismaService.usuario.findFirst.mockResolvedValue(mockSupervisor);
      mockPrismaService.usuario.update.mockResolvedValue(mockUpdatedSupervisor);

      const result = await service.remove('supervisor-uuid', 'admin-id');

      expect(result.activo).toBe(false);
      expect(result.deletedAt).not.toBeNull();
      expect(mockPrismaService.usuario.update).toHaveBeenCalledWith({
        where: { id: 'supervisor-uuid' },
        data: {
          activo: false,
          deletedAt: expect.any(Date),
          updatedBy: 'admin-id',
        },
      });
    });
  });
});
