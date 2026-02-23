-- AlterTable
ALTER TABLE "EntePublico" ADD COLUMN     "datosConfirmados" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "cambioPasswordDefault" BOOLEAN NOT NULL DEFAULT false;
