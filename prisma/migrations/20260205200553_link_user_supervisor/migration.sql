-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "supervisorId" TEXT;

-- CreateIndex
CREATE INDEX "Usuario_supervisorId_idx" ON "Usuario"("supervisorId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Supervisor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
