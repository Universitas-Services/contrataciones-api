-- Número y fecha del Oficio de Notificación de Decaimiento (Fase 4, Hito 3)

ALTER TABLE "tb_decaimiento_adjudicacion_fase4_au_au"
  ADD COLUMN "num_oficio_notificacion_decaimiento_au_au" VARCHAR(100),
  ADD COLUMN "fecha_oficio_notificacion_decaimiento_au_au" TIMESTAMP(3);
