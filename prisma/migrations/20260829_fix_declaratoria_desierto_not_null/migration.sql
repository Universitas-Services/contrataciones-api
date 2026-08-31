-- La migración 20260727_add_declaratoria_desierto creó la columna sin NOT NULL,
-- mientras que el schema Prisma la declara como Boolean obligatorio con default
-- false. Esto alinea la base con el modelo.

UPDATE "tb_expediente_contratacion"
  SET "declaratoria_desierto_au_au" = false
  WHERE "declaratoria_desierto_au_au" IS NULL;

ALTER TABLE "tb_expediente_contratacion"
  ALTER COLUMN "declaratoria_desierto_au_au" SET DEFAULT false,
  ALTER COLUMN "declaratoria_desierto_au_au" SET NOT NULL;
