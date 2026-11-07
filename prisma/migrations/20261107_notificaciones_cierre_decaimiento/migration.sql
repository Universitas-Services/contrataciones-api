-- Número y fecha de la notificación al subsiguiente y del aviso de fin de procedimiento (Fase 4, Hito 4)

ALTER TABLE "tb_decaimiento_adjudicacion_fase4_au_au"
  ADD COLUMN "num_notificacion_adjudicacion_subsiguiente_au_au" VARCHAR(100),
  ADD COLUMN "fecha_notificacion_adjudicacion_subsiguiente_au_au" TIMESTAMP(3),
  ADD COLUMN "num_notificacion_fin_proceso_au_au" VARCHAR(100),
  ADD COLUMN "fecha_notificacion_fin_proceso_au_au" TIMESTAMP(3);
