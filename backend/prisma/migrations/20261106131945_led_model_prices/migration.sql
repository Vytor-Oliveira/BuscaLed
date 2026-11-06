-- AlterTable
ALTER TABLE "LedModel" ADD COLUMN     "costCents" INTEGER,
ADD COLUMN     "priceCents" INTEGER;

-- AlterTable
ALTER TABLE "Reservation" ALTER COLUMN "updatedAt" DROP DEFAULT;
