import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type {
  DictamenCompliance,
  DocumentoCompliance,
  ExpedienteCompliance,
  Prisma,
  RolUsuario,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CloudinaryService } from '../storage/cloudinary.service';
import type { UsuarioActual } from '../common/types/usuario-actual.type';
import { AccionAgente, AgenteComplianceClient, CatalogoAgente } from './agente-compliance.client';
import {
  EXTENSIONES_PERMITIDAS,
  MAXIMO_AGENTE_MB,
  TIPOS_MULTIPLES,
  extension,
  nombreArchivoUtf8,
  progreso,
  riesgo,
  siguienteDocumento,
  textoAnalizando,
  textoDictamenSolicitado,
  textoModalidadNoDisponible,
  textoSaludo,
  textoSubido,
} from './compliance.util';
import type {
  CrearExpedienteComplianceDto,
  DatosExpedienteComplianceDto,
  ListarExpedientesComplianceQuery,
} from './dto/compliance.dto';
import { markdownAPdf } from './markdown-pdf.util';

const ACCESO_GLOBAL: RolUsuario[] = ['UNIVERSITAS', 'SUPERVISOR'];
export const ROLES_ESCRITURA: RolUsuario[] = ['UNIVERSITAS', 'ADMIN_ENTE', 'EJECUTOR'];
const HISTORIAL_MAXIMO = 60;

type Tx = Prisma.TransactionClient;
type ExpedienteConEnte = ExpedienteCompliance & { ente: { id: string; nombre: string } };

interface MensajeNuevo {
  rol: 'USUARIO' | 'AGENTE';
  texto: string;
  usuarioId?: string | null;
  documentoId?: string | null;
  dictamenId?: string | null;
}

/** Un dato del expediente que no se pudo guardar, con el texto para el usuario. */
interface Aviso {
  tipo: 'NO_DISPONIBLE' | 'BLOQUEADO' | 'INVALIDO';
  texto: string;
}

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agente: AgenteComplianceClient,
    private readonly almacenamiento: CloudinaryService,
    private readonly config: ConfigService,
  ) {}

  // ════════════════════════════════════════════════════════════════════
  //  Acceso
  // ════════════════════════════════════════════════════════════════════

  private puedeEscribir(user: UsuarioActual) {
    return ROLES_ESCRITURA.includes(user.rol);
  }

  private assertEscritura(user: UsuarioActual) {
    if (!this.puedeEscribir(user)) {
      throw new ForbiddenException('Su rol solo permite consultar el módulo de compliance.');
    }
  }

  private async cargar(
    id: string,
    user: UsuarioActual,
    escritura = false,
  ): Promise<ExpedienteConEnte> {
    const expediente = await this.prisma.expedienteCompliance.findFirst({
      where: { id, deletedAt: null },
      include: { ente: { select: { id: true, nombre: true } } },
    });
    if (!expediente) throw new NotFoundException(`Expediente de compliance ${id} no encontrado`);
    if (!ACCESO_GLOBAL.includes(user.rol) && expediente.enteId !== user.enteId) {
      throw new ForbiddenException('No tiene acceso a este expediente');
    }
    if (escritura) this.assertEscritura(user);
    return expediente;
  }

  private assertNoCerrado(expediente: { estado: string }) {
    if (expediente.estado === 'CERRADA') {
      throw new ConflictException('El expediente está cerrado: ya tiene dictamen final.');
    }
  }

  private assertActivo(expediente: { estado: string }) {
    this.assertNoCerrado(expediente);
    if (expediente.estado !== 'ACTIVA') {
      throw new BadRequestException(
        'Primero registra la nomenclatura, la modalidad y el tipo de contratación.',
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  Catálogo
  // ════════════════════════════════════════════════════════════════════

  catalogo() {
    return this.agente.obtenerCatalogo();
  }

  /** Para pantallas que pueden mostrarse aunque el agente no responda. */
  private async catalogoOpcional(): Promise<CatalogoAgente | null> {
    try {
      return await this.agente.obtenerCatalogo();
    } catch {
      return null;
    }
  }

  private checklistDe(catalogo: CatalogoAgente | null, modalidad: string | null) {
    if (!catalogo || !modalidad) return null;
    return catalogo.modalidades.find((m) => m.valor === modalidad)?.checklist ?? null;
  }

  private nombreTipo(catalogo: CatalogoAgente | null, modalidad: string | null, tipo: string) {
    return (
      this.checklistDe(catalogo, modalidad)?.find((c) => c.tipo_documento === tipo)?.nombre ?? tipo
    );
  }

  // ════════════════════════════════════════════════════════════════════
  //  Expedientes
  // ════════════════════════════════════════════════════════════════════

  async listar(user: UsuarioActual, query: ListarExpedientesComplianceQuery = {}) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const filtroEnte = ACCESO_GLOBAL.includes(user.rol) ? query.enteId : user.enteId;
    const where: Prisma.ExpedienteComplianceWhereInput = {
      deletedAt: null,
      ...(filtroEnte ? { enteId: filtroEnte } : {}),
      ...(query.estado ? { estado: query.estado } : {}),
      ...(query.search
        ? {
            OR: [
              { nomenclatura: { contains: query.search, mode: 'insensitive' } },
              { nombre: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, expedientes, catalogo] = await Promise.all([
      this.prisma.expedienteCompliance.count({ where }),
      this.prisma.expedienteCompliance.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          ente: { select: { id: true, nombre: true } },
          documentos: {
            where: { vigente: true },
            select: {
              tipoDocumento: true,
              estado: true,
              vigente: true,
              tipoCoincide: true,
              estatusGlobal: true,
            },
          },
          dictamenes: {
            where: { estado: 'LISTO' },
            orderBy: { listoAt: 'desc' },
            take: 1,
            select: { puntaje: true },
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      }),
      this.catalogoOpcional(),
    ]);

    const data = expedientes.map((e) => ({
      id: e.id,
      ente: e.ente,
      nomenclatura: e.nomenclatura,
      nombre: e.nombre,
      modalidad: e.modalidad,
      tipoContratacion: e.tipoContratacion,
      estado: e.estado,
      progreso: progreso(this.checklistDe(catalogo, e.modalidad), e.documentos),
      riesgo: riesgo(e.dictamenes[0]?.puntaje ?? null, e.documentos),
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));

    return {
      metadata: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data,
    };
  }

  async crear(dto: CrearExpedienteComplianceDto, user: UsuarioActual) {
    this.assertEscritura(user);
    const enteId = user.rol === 'UNIVERSITAS' ? dto.enteId : user.enteId;
    if (!enteId) {
      throw new BadRequestException('Indique el ente al que pertenece el expediente (enteId).');
    }
    const [ente, usuario] = await Promise.all([
      this.prisma.entePublico.findUnique({ where: { id: enteId }, select: { nombre: true } }),
      this.prisma.usuario.findUnique({
        where: { id: user.id },
        select: { nombre: true, apellido: true },
      }),
    ]);
    if (!ente) throw new NotFoundException(`Ente ${enteId} no encontrado`);

    const { datos, avisos } = await this.validarDatos(dto, null, 0);
    const primero = avisos[0];
    if (primero) throw this.excepcionDeAviso(primero);

    const id = await this.prisma.$transaction(async (tx) => {
      const expediente = await tx.expedienteCompliance.create({
        data: { enteId, ...datos, createdBy: user.id, updatedBy: user.id },
      });
      await this.registrarMensajes(tx, expediente.id, [
        { rol: 'AGENTE', texto: textoSaludo(nombreCompleto(usuario), ente.nombre) },
      ]);
      await this.actualizarEstado(tx, expediente.id);
      return expediente.id;
    });
    return this.detalle(id, user);
  }

  async detalle(id: string, user: UsuarioActual) {
    const expediente = await this.cargar(id, user);
    const [documentos, dictamenes, catalogo] = await Promise.all([
      this.prisma.documentoCompliance.findMany({
        where: { expedienteId: id },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.dictamenCompliance.findMany({
        where: { expedienteId: id },
        orderBy: { createdAt: 'desc' },
      }),
      this.catalogoOpcional(),
    ]);

    const checklist = this.checklistDe(catalogo, expediente.modalidad);
    const vigentes = documentos.filter((d) => d.vigente);
    const ultimoListo = dictamenes.find((d) => d.estado === 'LISTO');
    const modalidad = catalogo?.modalidades.find((m) => m.valor === expediente.modalidad);

    return {
      id: expediente.id,
      ente: expediente.ente,
      nomenclatura: expediente.nomenclatura,
      nombre: expediente.nombre,
      modalidad: expediente.modalidad,
      nombreModalidad: modalidad?.nombre ?? null,
      tipoContratacion: expediente.tipoContratacion,
      estado: expediente.estado,
      cerradoAt: expediente.cerradoAt,
      puedeEditar: this.puedeEscribir(user) && expediente.estado !== 'CERRADA',
      progreso: progreso(checklist, vigentes),
      riesgo: riesgo(ultimoListo?.puntaje ?? null, vigentes),
      siguienteDocumento:
        expediente.estado === 'ACTIVA'
          ? siguienteDocumento(checklist, vigentes, expediente.tipoDocumentoSolicitado)
          : null,
      checklist: (checklist ?? []).map((c) => ({
        tipoDocumento: c.tipo_documento,
        nombre: c.nombre,
        admiteVarios: TIPOS_MULTIPLES.has(c.tipo_documento),
        documentos: vigentes
          .filter((d) => d.tipoDocumento === c.tipo_documento)
          .map((d) => this.vistaDocumento(d)),
      })),
      documentosReemplazados: documentos
        .filter((d) => !d.vigente)
        .map((d) => this.vistaDocumento(d)),
      dictamenes: dictamenes.map((d) => this.vistaDictamen(d, false)),
      createdAt: expediente.createdAt,
      updatedAt: expediente.updatedAt,
    };
  }

  async actualizar(id: string, dto: DatosExpedienteComplianceDto, user: UsuarioActual) {
    const expediente = await this.cargar(id, user, true);
    this.assertNoCerrado(expediente);
    const documentos = await this.prisma.documentoCompliance.count({ where: { expedienteId: id } });

    const { datos, avisos } = await this.validarDatos(dto, expediente, documentos);
    const primero = avisos[0];
    if (primero) throw this.excepcionDeAviso(primero);

    await this.prisma.$transaction(async (tx) => {
      await tx.expedienteCompliance.update({
        where: { id },
        data: { ...datos, updatedBy: user.id },
      });
      await this.actualizarEstado(tx, id);
    });
    return this.detalle(id, user);
  }

  /**
   * Comprueba nomenclatura, nombre, modalidad y tipo contra el catálogo. Lo
   * usan los botones (PATCH) y la acción `fijar_expediente` del chat.
   */
  private async validarDatos(
    dto: DatosExpedienteComplianceDto,
    actual: { modalidad: string | null; tipoContratacion: string | null } | null,
    documentosCargados: number,
  ) {
    const datos: {
      nomenclatura?: string;
      nombre?: string;
      modalidad?: string;
      tipoContratacion?: string;
    } = {};
    const avisos: Aviso[] = [];

    if (dto.nomenclatura?.trim()) datos.nomenclatura = dto.nomenclatura.trim().slice(0, 100);
    if (dto.nombre?.trim()) datos.nombre = dto.nombre.trim().slice(0, 255);

    const cambiaModalidad = dto.modalidad != null && dto.modalidad !== actual?.modalidad;
    const cambiaTipo =
      dto.tipoContratacion != null && dto.tipoContratacion !== actual?.tipoContratacion;
    if (!cambiaModalidad && !cambiaTipo) return { datos, avisos };

    // Con documentos cargados, cambiar modalidad o tipo invalidaría los análisis.
    if (documentosCargados > 0) {
      avisos.push({
        tipo: 'BLOQUEADO',
        texto:
          'La modalidad y el tipo de contratación no se pueden cambiar porque el expediente ya tiene documentos.',
      });
      return { datos, avisos };
    }

    const catalogo = await this.agente.obtenerCatalogo();
    if (cambiaModalidad) {
      const modalidad = catalogo.modalidades.find((m) => m.valor === dto.modalidad);
      if (!modalidad) {
        avisos.push({ tipo: 'INVALIDO', texto: `La modalidad ${dto.modalidad} no existe.` });
      } else if (modalidad.estado !== 'disponible') {
        avisos.push({ tipo: 'NO_DISPONIBLE', texto: textoModalidadNoDisponible(modalidad.nombre) });
      } else {
        datos.modalidad = modalidad.valor;
      }
    }
    if (cambiaTipo) {
      const tipo = catalogo.tipos_contratacion.find((t) => t.valor === dto.tipoContratacion);
      if (!tipo) {
        avisos.push({
          tipo: 'INVALIDO',
          texto: `El tipo de contratación ${dto.tipoContratacion} no existe.`,
        });
      } else {
        datos.tipoContratacion = tipo.valor;
      }
    }
    return { datos, avisos };
  }

  private excepcionDeAviso(aviso: Aviso): HttpException {
    return aviso.tipo === 'BLOQUEADO'
      ? new ConflictException(aviso.texto)
      : new BadRequestException(aviso.texto);
  }

  /** CONFIGURANDO pasa a ACTIVA cuando están nomenclatura, modalidad y tipo. */
  private async actualizarEstado(tx: Tx, id: string) {
    const expediente = await tx.expedienteCompliance.findUniqueOrThrow({ where: { id } });
    if (
      expediente.estado === 'CONFIGURANDO' &&
      expediente.nomenclatura &&
      expediente.modalidad &&
      expediente.tipoContratacion
    ) {
      await tx.expedienteCompliance.update({ where: { id }, data: { estado: 'ACTIVA' } });
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  Chat
  // ════════════════════════════════════════════════════════════════════

  async mensajes(id: string, user: UsuarioActual) {
    await this.cargar(id, user);
    return this.prisma.mensajeCompliance.findMany({
      where: { expedienteId: id },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        rol: true,
        texto: true,
        documentoId: true,
        dictamenId: true,
        createdAt: true,
      },
    });
  }

  /**
   * Envía el mensaje al agente y aplica solo las acciones que trae la
   * respuesta. Si el agente no responde, no se guarda nada: el usuario lo
   * reenvía.
   */
  async enviarMensaje(id: string, mensaje: string, user: UsuarioActual) {
    const expediente = await this.cargar(id, user, true);
    const [usuario, documentos, dictamenesListos, historial] = await Promise.all([
      this.prisma.usuario.findUnique({
        where: { id: user.id },
        select: { nombre: true, apellido: true },
      }),
      this.prisma.documentoCompliance.findMany({
        where: { expedienteId: id, vigente: true, estado: 'ANALIZADO' },
        orderBy: { createdAt: 'asc' },
        select: { jsonAnalista: true },
      }),
      this.prisma.dictamenCompliance.count({ where: { expedienteId: id, estado: 'LISTO' } }),
      this.prisma.mensajeCompliance.findMany({
        where: { expedienteId: id },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: HISTORIAL_MAXIMO,
        select: { rol: true, texto: true },
      }),
    ]);

    const respuesta = await this.agente.conversar({
      usuario_nombre: nombreCompleto(usuario),
      ente: expediente.ente.nombre,
      expediente: {
        nomenclatura: expediente.nomenclatura,
        nombre: expediente.nombre,
        modalidad: expediente.modalidad,
        tipo_contratacion: expediente.tipoContratacion,
        documentos: documentos.map((d) => d.jsonAnalista).filter((j) => j != null),
        dictamenes: dictamenesListos,
      },
      historial: historial
        .reverse()
        .map((m) => ({ rol: m.rol === 'USUARIO' ? 'usuario' : 'agente', texto: m.texto })),
      mensaje,
    });

    const conversacion: MensajeNuevo[] = [{ rol: 'USUARIO', texto: mensaje, usuarioId: user.id }];
    if (respuesta.respuesta.trim()) {
      conversacion.push({ rol: 'AGENTE', texto: respuesta.respuesta });
    }
    const ids = await this.prisma.$transaction((tx) =>
      this.registrarMensajes(tx, id, conversacion),
    );

    // Un expediente cerrado sigue respondiendo dudas, pero no cambia.
    const acciones = expediente.estado === 'CERRADA' ? [] : respuesta.acciones;
    const avisos: MensajeNuevo[] = [];
    const aplicadas = await this.aplicarAcciones(expediente, acciones, user, avisos);
    if (avisos.length) {
      ids.push(...(await this.prisma.$transaction((tx) => this.registrarMensajes(tx, id, avisos))));
    }
    // El dictamen pedido por el chat deja su propio mensaje.
    const dictamenId = aplicadas.find((a) => a.accion === 'solicitar_dictamen')?.dictamenId;
    if (typeof dictamenId === 'string') {
      const delDictamen = await this.prisma.mensajeCompliance.findMany({
        where: { dictamenId },
        select: { id: true },
      });
      ids.push(...delDictamen.map((m) => m.id));
    }

    return {
      mensajes: await this.prisma.mensajeCompliance.findMany({
        where: { id: { in: ids } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          rol: true,
          texto: true,
          documentoId: true,
          dictamenId: true,
          createdAt: true,
        },
      }),
      acciones: aplicadas,
      expediente: await this.detalle(id, user),
    };
  }

  /** Aplica las acciones válidas. Las demás se descartan sin deducir nada del texto. */
  private async aplicarAcciones(
    expediente: ExpedienteConEnte,
    acciones: AccionAgente[],
    user: UsuarioActual,
    mensajes: MensajeNuevo[],
  ) {
    const aplicadas: { accion: string; [campo: string]: unknown }[] = [];

    for (const accion of acciones) {
      if (accion.accion === 'fijar_expediente') {
        const documentos = await this.prisma.documentoCompliance.count({
          where: { expedienteId: expediente.id },
        });
        const actual = await this.prisma.expedienteCompliance.findUniqueOrThrow({
          where: { id: expediente.id },
        });
        const { datos, avisos } = await this.validarDatos(
          {
            nomenclatura: texto(accion.nomenclatura),
            nombre: texto(accion.nombre),
            modalidad: texto(accion.modalidad),
            tipoContratacion: texto(accion.tipo_contratacion),
          },
          actual,
          documentos,
        );
        avisos.forEach((a) => mensajes.push({ rol: 'AGENTE', texto: a.texto }));
        if (Object.keys(datos).length) {
          await this.prisma.$transaction(async (tx) => {
            await tx.expedienteCompliance.update({
              where: { id: expediente.id },
              data: { ...datos, updatedBy: user.id },
            });
            await this.actualizarEstado(tx, expediente.id);
          });
          aplicadas.push({ accion: 'fijar_expediente', ...datos });
        }
        continue;
      }

      if (accion.accion === 'pedir_documento') {
        const tipo = texto(accion.tipo_documento);
        const actual = await this.prisma.expedienteCompliance.findUniqueOrThrow({
          where: { id: expediente.id },
        });
        const checklist = this.checklistDe(await this.catalogoOpcional(), actual.modalidad);
        if (tipo && checklist?.some((c) => c.tipo_documento === tipo)) {
          await this.prisma.expedienteCompliance.update({
            where: { id: expediente.id },
            data: { tipoDocumentoSolicitado: tipo },
          });
          aplicadas.push({ accion: 'pedir_documento', tipoDocumento: tipo });
        }
        continue;
      }

      if (accion.accion === 'solicitar_dictamen') {
        const forzarFinal = accion.forzar_final === true;
        try {
          const actual = await this.cargar(expediente.id, user, true);
          const dictamen = await this.crearDictamen(actual, forzarFinal, user);
          aplicadas.push({ accion: 'solicitar_dictamen', dictamenId: dictamen.id, forzarFinal });
        } catch (error) {
          if (!(error instanceof HttpException)) throw error;
          mensajes.push({
            rol: 'AGENTE',
            texto: `Todavía no puedo emitir el dictamen: ${mensajeDe(error)}`,
          });
        }
      }
    }
    return aplicadas;
  }

  /** Guarda los mensajes en orden, con un milisegundo de diferencia para no empatar. */
  private async registrarMensajes(tx: Tx, expedienteId: string, mensajes: MensajeNuevo[]) {
    const base = Date.now();
    const ids: string[] = [];
    for (const [i, m] of mensajes.entries()) {
      const creado = await tx.mensajeCompliance.create({
        data: {
          expedienteId,
          rol: m.rol,
          texto: m.texto,
          usuarioId: m.usuarioId ?? null,
          documentoId: m.documentoId ?? null,
          dictamenId: m.dictamenId ?? null,
          createdAt: new Date(base + i),
        },
        select: { id: true },
      });
      ids.push(creado.id);
    }
    await tx.expedienteCompliance.update({
      where: { id: expedienteId },
      data: { updatedAt: new Date() },
    });
    return ids;
  }

  // ════════════════════════════════════════════════════════════════════
  //  Documentos
  // ════════════════════════════════════════════════════════════════════

  private get maximoBytes() {
    const configurado = Number(this.config.get('COMPLIANCE_MAX_MB') ?? 10);
    const mb = Number.isFinite(configurado) && configurado > 0 ? configurado : 10;
    return Math.min(mb, MAXIMO_AGENTE_MB) * 1024 * 1024;
  }

  async subirDocumento(
    id: string,
    datos: { tipoDocumento: string; reemplazaDocumentoId?: string },
    archivo: Express.Multer.File | undefined,
    user: UsuarioActual,
  ) {
    const expediente = await this.cargar(id, user, true);
    this.assertActivo(expediente);

    if (!archivo?.buffer?.length)
      throw new BadRequestException('Adjunte el archivo en el campo `archivo`.');
    const nombreArchivo = nombreArchivoUtf8(archivo.originalname);
    if (!EXTENSIONES_PERMITIDAS.includes(extension(nombreArchivo))) {
      throw new UnsupportedMediaTypeException(
        `Formato no permitido. Use: ${EXTENSIONES_PERMITIDAS.join(', ')}.`,
      );
    }
    if (archivo.size > this.maximoBytes) {
      throw new PayloadTooLargeException(
        `El archivo supera el máximo de ${Math.round(this.maximoBytes / 1024 / 1024)} MB.`,
      );
    }

    const catalogo = await this.agente.obtenerCatalogo();
    const checklist = this.checklistDe(catalogo, expediente.modalidad);
    const tipo = checklist?.find((c) => c.tipo_documento === datos.tipoDocumento);
    if (!tipo) {
      throw new BadRequestException(
        `El tipo ${datos.tipoDocumento} no está en el checklist de la modalidad.`,
      );
    }

    const vigentesDelTipo = await this.prisma.documentoCompliance.findMany({
      where: { expedienteId: id, tipoDocumento: tipo.tipo_documento, vigente: true },
      select: { id: true, nombreArchivo: true },
    });
    let reemplazado: { id: string; nombreArchivo: string } | undefined;
    if (datos.reemplazaDocumentoId) {
      reemplazado = vigentesDelTipo.find((d) => d.id === datos.reemplazaDocumentoId);
      if (!reemplazado) {
        throw new BadRequestException(
          'El documento a reemplazar no existe, ya fue reemplazado o es de otro tipo.',
        );
      }
    } else if (vigentesDelTipo.length && !TIPOS_MULTIPLES.has(tipo.tipo_documento)) {
      throw new ConflictException(
        `${tipo.nombre} ya tiene un documento. Para subir otro, reemplácelo (reemplazaDocumentoId).`,
      );
    }

    const documentoId = randomUUID();
    const urlArchivo = await this.almacenamiento.uploadFile(
      archivo.buffer,
      `compliance/${id}`,
      `${documentoId}${extension(nombreArchivo)}`,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.documentoCompliance.create({
        data: {
          id: documentoId,
          expedienteId: id,
          tipoDocumento: tipo.tipo_documento,
          nombreArchivo: nombreArchivo.slice(0, 255),
          urlArchivo,
          mimeType: archivo.mimetype?.slice(0, 120) ?? null,
          tamanoBytes: archivo.size,
          createdBy: user.id,
        },
      });
      if (reemplazado) {
        await tx.documentoCompliance.update({
          where: { id: reemplazado.id },
          data: { vigente: false, reemplazadoAt: new Date() },
        });
      }
      await this.registrarMensajes(tx, id, [
        {
          rol: 'USUARIO',
          texto: textoSubido(nombreArchivo, tipo.nombre, reemplazado?.nombreArchivo),
          usuarioId: user.id,
          documentoId,
        },
        { rol: 'AGENTE', texto: textoAnalizando(nombreArchivo), documentoId },
      ]);
    });

    return this.documento(documentoId, user);
  }

  private async cargarDocumento(documentoId: string, user: UsuarioActual, escritura = false) {
    const documento = await this.prisma.documentoCompliance.findUnique({
      where: { id: documentoId },
    });
    if (!documento) throw new NotFoundException(`Documento ${documentoId} no encontrado`);
    const expediente = await this.cargar(documento.expedienteId, user, escritura);
    return { documento, expediente };
  }

  async documento(documentoId: string, user: UsuarioActual) {
    const { documento } = await this.cargarDocumento(documentoId, user);
    return this.vistaDocumento(documento);
  }

  async reintentarDocumento(documentoId: string, user: UsuarioActual) {
    const { documento, expediente } = await this.cargarDocumento(documentoId, user, true);
    this.assertNoCerrado(expediente);
    if (documento.estado !== 'ERROR' || !documento.vigente) {
      throw new ConflictException('Solo se reintentan documentos vigentes con error.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.documentoCompliance.update({
        where: { id: documentoId },
        data: {
          estado: 'PENDIENTE',
          error: null,
          intentos429: 0,
          fallosTemporales: 0,
          primerIntentoAt: null,
          tomadoHasta: null,
          proximoIntentoAt: new Date(),
        },
      });
      await this.registrarMensajes(tx, expediente.id, [
        { rol: 'AGENTE', texto: textoAnalizando(documento.nombreArchivo), documentoId },
      ]);
    });
    return this.documento(documentoId, user);
  }

  /** Sin `json_analista` ni informe: son internos (sección 2 del contrato). */
  private vistaDocumento(d: DocumentoCompliance) {
    return {
      id: d.id,
      tipoDocumento: d.tipoDocumento,
      nombreArchivo: d.nombreArchivo,
      urlArchivo: d.urlArchivo,
      tamanoBytes: d.tamanoBytes,
      estado: d.estado,
      vigente: d.vigente,
      estatusGlobal: d.estatusGlobal,
      tipoCoincide: d.tipoCoincide,
      tipoDetectado: d.tipoDetectado,
      error: d.error,
      createdAt: d.createdAt,
      analizadoAt: d.analizadoAt,
      reemplazadoAt: d.reemplazadoAt,
    };
  }

  // ════════════════════════════════════════════════════════════════════
  //  Dictamen
  // ════════════════════════════════════════════════════════════════════

  async solicitarDictamen(id: string, forzarFinal: boolean, user: UsuarioActual) {
    const expediente = await this.cargar(id, user, true);
    const dictamen = await this.crearDictamen(expediente, forzarFinal, user);
    return this.vistaDictamen(dictamen, false);
  }

  private async crearDictamen(
    expediente: ExpedienteCompliance,
    forzarFinal: boolean,
    user: UsuarioActual,
  ) {
    this.assertActivo(expediente);
    const [enCurso, documentos] = await Promise.all([
      this.prisma.dictamenCompliance.count({
        where: { expedienteId: expediente.id, estado: { in: ['PENDIENTE', 'PROCESANDO'] } },
      }),
      this.prisma.documentoCompliance.findMany({
        where: { expedienteId: expediente.id, vigente: true },
        select: { estado: true },
      }),
    ]);
    if (enCurso) throw new ConflictException('Ya hay un dictamen en preparación.');
    if (documentos.some((d) => d.estado === 'PENDIENTE' || d.estado === 'PROCESANDO')) {
      throw new ConflictException('Hay documentos en análisis: espere a que terminen.');
    }
    if (!documentos.some((d) => d.estado === 'ANALIZADO')) {
      throw new BadRequestException('Hace falta al menos un documento analizado.');
    }

    return this.prisma.$transaction(async (tx) => {
      const dictamen = await tx.dictamenCompliance.create({
        data: { expedienteId: expediente.id, forzarFinal, createdBy: user.id },
      });
      await this.registrarMensajes(tx, expediente.id, [
        { rol: 'AGENTE', texto: textoDictamenSolicitado(forzarFinal), dictamenId: dictamen.id },
      ]);
      return dictamen;
    });
  }

  private async cargarDictamen(dictamenId: string, user: UsuarioActual) {
    const dictamen = await this.prisma.dictamenCompliance.findUnique({ where: { id: dictamenId } });
    if (!dictamen) throw new NotFoundException(`Dictamen ${dictamenId} no encontrado`);
    const expediente = await this.cargar(dictamen.expedienteId, user);
    return { dictamen, expediente };
  }

  async dictamen(dictamenId: string, user: UsuarioActual) {
    const { dictamen } = await this.cargarDictamen(dictamenId, user);
    return this.vistaDictamen(dictamen, true);
  }

  async dictamenPdf(dictamenId: string, user: UsuarioActual) {
    const { dictamen, expediente } = await this.cargarDictamen(dictamenId, user);
    if (dictamen.estado !== 'LISTO' || !dictamen.markdown) {
      throw new ConflictException('El dictamen todavía no está listo.');
    }
    const nomenclatura = expediente.nomenclatura ?? 'expediente';
    const buffer = await markdownAPdf(dictamen.markdown, `Dictamen ${nomenclatura}`);
    const alcance = (dictamen.alcance ?? 'parcial').toLowerCase();
    const seguro = nomenclatura.replace(/[^\w.-]+/g, '_');
    return { buffer, fileName: `dictamen-${seguro}-${alcance}.pdf` };
  }

  private vistaDictamen(d: DictamenCompliance, conMarkdown: boolean) {
    return {
      id: d.id,
      estado: d.estado,
      forzarFinal: d.forzarFinal,
      alcance: d.alcance,
      puntaje: d.puntaje,
      pendientes: d.pendientes,
      coherencia: d.coherencia,
      error: d.error,
      createdAt: d.createdAt,
      listoAt: d.listoAt,
      ...(conMarkdown ? { markdown: d.markdown } : {}),
    };
  }
}

function nombreCompleto(usuario: { nombre: string; apellido: string } | null): string {
  return usuario ? `${usuario.nombre} ${usuario.apellido}`.trim() : 'usuario';
}

function texto(valor: unknown): string | undefined {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : undefined;
}

function mensajeDe(error: HttpException): string {
  const respuesta = error.getResponse();
  if (typeof respuesta === 'string') return respuesta;
  const mensaje = (respuesta as { message?: unknown }).message;
  if (Array.isArray(mensaje)) return mensaje.join(' ');
  return typeof mensaje === 'string' ? mensaje : error.message;
}
