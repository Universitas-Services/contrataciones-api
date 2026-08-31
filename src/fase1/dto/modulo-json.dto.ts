import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Cuerpo de los micromódulos cuya información es una estructura dinámica
 * (modelo de contrato, calificación legal/financiera/técnica y evaluación
 * técnica-económica).
 *
 * Estos formularios son colecciones anidadas de tamaño variable — criterios con
 * sus rangos, recaudos con claves dinámicas — por eso viajan bajo `data` y se
 * guardan en una columna JSONB. Las reglas de negocio se verifican al completar
 * el micromódulo, no al guardar el borrador.
 *
 * Cada micromódulo declara abajo su propia subclase para documentar en Swagger
 * la forma concreta que espera.
 */
export class ModuloJsonDto {
  @ApiProperty({
    description: 'Formulario completo del micromódulo',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  data: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Modelo de contrato
// ---------------------------------------------------------------------------

export class ModeloContratoDto {
  @ApiProperty({
    description: 'Cláusulas ordenadas del modelo de contrato. Se exige al menos una al completar.',
    type: 'object',
    additionalProperties: true,
    example: {
      clauses: [
        {
          instanceId: 'c1',
          order: 1,
          titulo: 'Objeto del contrato',
          cuerpoHtml:
            '<p>El presente contrato tiene por objeto {desc_objeto_contratacion_au_au}.</p>',
          kind: 'preceptiva',
          origen: 'generica',
          basamentoLegal: 'Art. 120 LCP',
        },
        {
          instanceId: 'c2',
          order: 2,
          titulo: 'Plazo de ejecución',
          cuerpoHtml: '<p>El plazo de ejecución será de 90 días continuos.</p>',
          kind: 'facultativa',
          origen: 'custom',
        },
      ],
    },
  })
  @IsObject()
  data: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Calificación Legal
// ---------------------------------------------------------------------------

export class CalificacionLegalDto {
  @ApiProperty({
    description:
      'Configuración de recaudos. `exigidos` responde SI/NO cada recaudo del catálogo; ' +
      '`sustitutos` solo aplica a los recaudos que admiten declaración jurada y que fueron exigidos; ' +
      '`personalizados` son recaudos propios del Ente. Al completar se exige al menos un recaudo por sobre.',
    type: 'object',
    additionalProperties: true,
    example: {
      exigidos: {
        modCartaManifestacionVoluntadAuAu: true,
        modCartaAutorizacionAuAu: true,
        modDocConstitutivoAuAu: true,
        modCopiaRifVigenteAuAu: true,
        modCertificadoRncAuAu: false,
        modSolvenciaLaboralAuAu: true,
        modDeclaracionSociosNoInhabilitadosAuAu: true,
        modDeclaracionNoDeudasEnteAuAu: true,
        modDeclaracionNoImpedimentosLcpAuAu: true,
        modDeclaracionConocimientoLugarAuAu: false,
        modDeclaracionInfoFinancieraAuAu: true,
        modEvaluacionDesempenoAuAu: false,
        modCartaOfertaAuAu: true,
        modDeclaracionCapacidadFinancieraAuAu: true,
        modDeclaracionCompromisoRespSocialAuAu: true,
        modGarantiaMantenimientoOfertaAuAu: true,
        modDeclaracionAutocalculoVanAuAu: false,
        modCartaNotificacionesAuAu: true,
        modGarantiaFielCumplAuAu: true,
        modFianzaLaboralAuAu: false,
      },
      sustitutos: {
        sustitutoDjRifVigenteAuAu: true,
      },
      personalizados: [
        {
          id: 'p1',
          sobre: 1,
          descripcion: 'Certificado de inscripción en el registro municipal',
          exigido: true,
          // Sin modelo: el oferente consigna el documento por su cuenta.
          tieneModelo: false,
        },
        {
          id: 'p2',
          sobre: 2,
          descripcion: 'Planilla de compromiso de abastecimiento local',
          exigido: true,
          // Con modelo: es obligatorio cargar el archivo que el oferente descargará.
          // La URL se obtiene de POST .../calificacion-legal/modelos
          tieneModelo: true,
          archivoModeloUrl: 'https://res.cloudinary.com/.../modelo-compromiso-abastecimiento.pdf',
        },
      ],
    },
  })
  @IsObject()
  data: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Calificación Financiera
// ---------------------------------------------------------------------------

export class CalificacionFinancieraDto {
  @ApiProperty({
    description:
      'Criterios financieros activables. Cada criterio con rangos usa el bloque `rangos<Criterio>`. ' +
      'Los rangos son ascendentes (máximo > hasta ≥ desde ≥ mínimo) salvo endeudamiento, que es inverso ' +
      '(óptimo < desde ≤ hasta ≤ deficiente). Al completar se exige al menos un criterio activo.',
    type: 'object',
    additionalProperties: true,
    example: {
      criterioCalifFinanDescapital: true,
      puntajeMaximoDescapital: 20,

      criterioCalifFinanSolvencia: true,
      rangosSolvencia: {
        rangoMaximo: 2.0,
        puntajeMaximo: 20,
        rangoMedioDesde: 1.2,
        rangoMedioHasta: 1.9,
        puntajeMedio: 12,
        rangoMinimo: 1.0,
        puntajeMinimo: 5,
      },

      criterioCalifFinanRotacion: false,
      criterioCalifFinanRendimiento: false,
      criterioCalifFinanRentabilidad: false,

      criterioCalifFinanEndeudamiento: true,
      rangosEndeudamiento: {
        rangoMaximo: 0.3,
        puntajeMaximo: 20,
        rangoMedioDesde: 0.4,
        rangoMedioHasta: 0.6,
        puntajeMedio: 12,
        rangoMinimo: 0.8,
        puntajeMinimo: 5,
      },

      puntuacionMinimaCalifFinanciera: 60,
    },
  })
  @IsObject()
  data: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Calificación Técnica
// ---------------------------------------------------------------------------

export class CalificacionTecnicaDto {
  @ApiProperty({
    description:
      'Criterios técnicos con sus rangos de cumplimiento. Al completar, la suma de `puntuacion` de ' +
      'todos los criterios debe ser exactamente 100, ningún rango puede superar la puntuación de su ' +
      'criterio padre, y `puntuacionMinimaCalifTecnica` no puede superar el total.',
    type: 'object',
    additionalProperties: true,
    example: {
      criterios: [
        {
          id: 'ct1',
          nombre: 'Experiencia acumulada en obras similares',
          puntuacion: 60,
          descripcion:
            'Se valora la experiencia comprobable en proyectos de naturaleza equivalente.',
          rangos: [
            { descripcion: 'Igual o mayor a 10 años', puntaje: 60 },
            { descripcion: 'Entre 5 y 9 años', puntaje: 35 },
            { descripcion: 'Menos de 5 años', puntaje: 10 },
          ],
        },
        {
          id: 'ct2',
          nombre: 'Disponibilidad de maquinaria propia',
          puntuacion: 40,
          descripcion: 'Se valora el parque de maquinaria propio del oferente.',
          rangos: [
            { descripcion: 'Maquinaria propia completa', puntaje: 40 },
            { descripcion: 'Maquinaria parcialmente arrendada', puntaje: 20 },
          ],
        },
      ],
      puntuacionMinimaCalifTecnica: 70,
    },
  })
  @IsObject()
  data: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Evaluación Técnica y Económica
// ---------------------------------------------------------------------------

export class EvaluacionTecnicaEconomicaDto {
  @ApiProperty({
    description:
      'Bolsa única compartida de 100 puntos entre los bloques técnico y económico. Al completar, la ' +
      'suma de las puntuaciones de ambos bloques debe ser exactamente 100, ningún rango puede superar ' +
      'a su criterio padre, y cada `puntuacionMinima` no puede superar el total de su bloque.',
    type: 'object',
    additionalProperties: true,
    example: {
      tecnica: {
        criterios: [
          {
            id: 'et1',
            nombre: 'Tiempo de entrega',
            puntuacion: 30,
            descripcion: 'Menor plazo ofertado respecto al plazo referencial.',
            rangos: [
              { descripcion: 'Hasta 30 días', puntaje: 30 },
              { descripcion: 'Entre 31 y 60 días', puntaje: 15 },
            ],
          },
          {
            id: 'et2',
            nombre: 'Garantía técnica extendida',
            puntuacion: 10,
            descripcion: 'Meses de garantía por encima del mínimo exigido.',
            rangos: [
              { descripcion: '24 meses o más', puntaje: 10 },
              { descripcion: 'Entre 12 y 23 meses', puntaje: 5 },
            ],
          },
        ],
        puntuacionMinima: 25,
      },
      economica: {
        criterios: [
          {
            id: 'ee1',
            nombre: 'Precio ofertado',
            puntuacion: 60,
            descripcion: 'Menor precio respecto al presupuesto base.',
            rangos: [
              { descripcion: 'Menor o igual al 90% del presupuesto base', puntaje: 60 },
              { descripcion: 'Entre 91% y 100% del presupuesto base', puntaje: 30 },
            ],
          },
        ],
        puntuacionMinima: 30,
      },
    },
  })
  @IsObject()
  data: Record<string, any>;
}
