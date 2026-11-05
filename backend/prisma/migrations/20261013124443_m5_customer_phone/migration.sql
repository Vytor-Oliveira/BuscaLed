-- AlterTable
-- Coluna nullable: aditiva e segura em banco com linhas existentes, sem
-- precisar de DEFAULT (diferente do updatedAt da migration do M4).
ALTER TABLE "Reservation" ADD COLUMN     "customerPhone" TEXT;
