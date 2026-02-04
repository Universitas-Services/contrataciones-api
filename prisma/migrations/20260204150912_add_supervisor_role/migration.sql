-- AlterEnum
ALTER TYPE "RolUsuario" ADD VALUE 'SUPERVISOR';

-- CreateTable
CREATE TABLE "SupervisorAsignacion" (
    "id" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "SupervisorAsignacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupervisorAsignacion_supervisorId_idx" ON "SupervisorAsignacion"("supervisorId");

-- CreateIndex
CREATE INDEX "SupervisorAsignacion_enteId_idx" ON "SupervisorAsignacion"("enteId");

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorAsignacion_supervisorId_enteId_key" ON "SupervisorAsignacion"("supervisorId", "enteId");

-- AddForeignKey
ALTER TABLE "SupervisorAsignacion" ADD CONSTRAINT "SupervisorAsignacion_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorAsignacion" ADD CONSTRAINT "SupervisorAsignacion_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "EntePublico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
