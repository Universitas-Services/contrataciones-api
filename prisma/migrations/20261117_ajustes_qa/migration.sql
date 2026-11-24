-- Ajustes de QA (noviembre de 2026)

-- 3. La justificación de la necesidad deja de cortarse en 255 caracteres.
ALTER TABLE "tb_fase_preparatoria"
  ALTER COLUMN "justificacion_necesidad_contratacion_au_au" TYPE TEXT;

-- 10. Página web del ente, para el pliego y los informes.
ALTER TABLE "EntePublico" ADD COLUMN "pagina_web" VARCHAR(255);

-- 9. Orden de la normativa global, el de la documentación.
ALTER TABLE "tb_normativa_global" ADD COLUMN "num_orden" INTEGER;

UPDATE "tb_normativa_global" AS n
SET "num_orden" = v.orden
FROM (VALUES
  ('Constitución de la República Bolivariana de Venezuela (1999).', 1),
  ('Ley Constitucional Contra La Guerra Económica Para La Racionalidad Y Uniformidad En La Adquisición De Bienes, Servicios Y Obras Públicas, publicado en Gaceta Oficial N° 41.318 de fecha 11 de enero de 2018.', 2),
  ('Decreto Nº 1399 con Rango, Valor y Fuerza de Ley de Contrataciones Públicas. Gaceta Oficial Extraordinaria N° 6.154 de fecha 19 de noviembre de 2014.', 3),
  ('Ley Orgánica de la Contraloría General de la República y del Sistema Nacional de Control Fiscal. Gaceta Oficial Extraordinaria N° 6.013 del 23 de diciembre de 2010.', 4),
  ('Ley Orgánica de Procedimientos Administrativos, publicada en Gaceta Oficial N° 2.818 del 1° de julio de 1981.', 5),
  ('Decreto N° 1.424 con Rango, Valor y Fuerza de Ley de Reforma de Ley Orgánica de la Administración Pública. Gaceta Oficial Extraordinaria N° 6.147 del 17 de noviembre de 2014.', 6),
  ('Decreto con Rango, Valor y Fuerza de Ley contra la Corrupción. Gaceta Oficial Extraordinaria N° 6.699 del 02 de mayo de 2022.', 7),
  ('Decreto N° 1423 con Rango, Valor y Fuerza de Ley de Simplificación de Trámites Administrativos. Gaceta Oficial N° 40.549 del 26 de noviembre de 2014.', 8),
  ('Decreto con Rango, Valor y Fuerza de Ley Orgánica de Planificación Pública y Popular (G.O. N°. Ext. 6.148 del 18/11/2014).', 9),
  ('Decreto N° 2174 con Rango, Valor y Fuerza de Ley Orgánica de la Administración Financiera del Sector Público (LOAFSP). Gaceta Oficial Extraordinaria N° 6.210 extraordinaria del 30 de diciembre de 2015 y sus reglamentos.', 10),
  ('Reglamento de la Ley de Contrataciones Públicas, Decreto N° 6.708 de fecha 19 de mayo de 2009 publicada en Gaceta Oficial N° 39.181 del 19 de mayo de 2009.', 11),
  ('Decreto N° 1.407, con Rango, Valor y Fuerza de Ley de Reforma Parcial del de Ley Orgánica de Bienes Públicos, publicado en Gaceta Oficial Extraordinario N° 6.155 de fecha 19 de noviembre de 2014.', 12),
  ('Decreto Ley Orgánica de Precios Justos, publicado en Gaceta Oficial N° 40.787 de fecha 12 de noviembre de 2015.', 13),
  ('Decreto N° 1.402 Ley de las Instituciones del Sector Bancario, publicado en Gaceta Oficial N° 40.557 de fecha martes 8 de diciembre de 2014.', 14),
  ('Ley Orgánica de las Comunas, publicada en Gaceta Oficial N° 6.011, el 21 de diciembre de 2010.', 15),
  ('Ley Orgánica del Poder Popular, publicada en la Gaceta Oficial Extraordinaria N° 6.812, en fecha 06 de junio de 2024.', 16),
  ('Ley Orgánica del Sistema Económico Comunal, publicada en Gaceta Oficial Extraordinario Nº 6.011 de fecha de 21 de diciembre de 2010.', 17),
  ('Decreto N° 9.052, mediante el cual se dicta el Decreto con Rango, Valor y Fuerza de Ley que promueve y regula las nuevas formas asociativas conjuntas entre el estado, la iniciativa comunitaria y privada para el desarrollo de la economía nacional, publicado en Gaceta Oficial N° 39.945 de fecha de 15 de junio de 2012.', 18),
  ('Ley de Infogobierno (Gaceta Oficial N° 40.274 del 17/10/2013)', 19),
  ('Ley sobre Mensaje de Datos y Firmas Electrónicas(DLMDyFE) (Gaceta Oficial N° 37.148 del 28/02/2001)', 20),
  ('Decreto N° 1.413 de Reforma del Decreto con Rango, Valor y Fuerza de Ley para la Promoción y Desarrollo de la Pequeña y Mediana Industria y Unidades de Propiedad Social,  Publicado en Gaceta Oficial N° 40.550 de fecha 27 de noviembre de 2014.', 21),
  ('Ley Constitucional de Precios acordados, publicado en Gaceta Oficial Extraordinaria N° 6.342 de fecha 22 de noviembre de 2017.', 22),
  ('Decreto N° 2.198 de creación del Sistema Centralizado y Estandarizado de compras públicas para la Administración Pública Nacional, publicado en Gaceta Oficial N° 40.836 de fecha de 26 de enero de 2016.', 23),
  ('Decreto Nº 8.795 Reglamento parcial Ley Orgánica del Sistema Económico Comunal, publicado en Gaceta Oficial Nº 39.856 de fecha de 02 de febrero de 2012.', 24),
  ('Providencia SUNDDE N° 003/2014, mediante la cual se fijan Criterios Contables Generales para la Determinación de Precios Justos, publicada en Gaceta Oficial Nº 40.351 de fecha de 7 de febrero de 2014.', 25),
  ('Resolución Mintras N° 9108 sobre Registro Nacional de Empresas y Establecimientos y Solvencia Laboral, publicada en Gaceta Oficial Nº 40.655 de fecha de 7 de mayo de 2015', 26),
  ('Providencia SUNDDE N° 070/2015 Modalidades para la Determinación, Fijación y Marcaje de Precios, publicada en Gaceta Oficial Nº 40.775 de fecha de 27 de octubre de 2015.', 27),
  ('Providencia Nº 001/2016, mediante la cual se regula el Proceso de Adquisición de Bienes por los Órganos y Entes de la Administración Pública Nacional en el Marco del Sistema Centralizado y Estandarizado de Compras Públicas, publicada en Gaceta Oficial Nº 40.906 de fecha de 18 de mayo de 2016.', 28),
  ('Resolución N° 006/2016 de fecha 16 de septiembre de 2016, Órgano Superior del Comando de Abastecimiento Soberano, publicada en la Gaceta Oficial de la República Bolivariana de Venezuela Nº 40.994 de fecha 22 de septiembre de 2016.', 29),
  ('Resolución Conjunta de los Ministerios del Poder Popular con competencia en materia de Planificación y de Economía, Finanzas y Comercio Exterior, mediante la cual se fija el valor de la Unidad para el Cálculo Aritmético del Umbral Máximo y Mínimo (UCAU), vigente y publicada en Gaceta Oficial de la República Bolivariana de Venezuela para el momento del inicio del procedimiento de selección de contratistas.', 30),
  ('Providencia SUNAI 007/2025 sobre Normas de control interno aplicables a contrataciones públicas, publicada en la Gaceta Oficial de la República Bolivariana de Venezuela Nº 43.158 de fecha 27 de junio de 2025.', 31),
  ('Ley Orgánica para la Celeridad y Optimización de Trámites Administrativos, Gaceta Oficial N° 7.018 Extraordinario, de fecha (08) de abril de 2026.', 32)
) AS v(texto, orden)
WHERE n."texto_normativa_completo" = v.texto;

-- Las que se cargaron a mano y no están en la documentación van al final,
-- en el orden en que se crearon.
WITH sin_orden AS (
  SELECT "id_normativa_global" AS id,
         ROW_NUMBER() OVER (ORDER BY "fec_creacion") AS fila
  FROM "tb_normativa_global"
  WHERE "num_orden" IS NULL
)
UPDATE "tb_normativa_global" AS n
SET "num_orden" = (SELECT COALESCE(MAX("num_orden"), 0) FROM "tb_normativa_global") + s.fila
FROM sin_orden AS s
WHERE n."id_normativa_global" = s.id;
