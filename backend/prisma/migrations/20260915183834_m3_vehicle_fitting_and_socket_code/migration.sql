/*
  Warnings:

  - You are about to drop the `LedCompatibility` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `socketCode` to the `LedModel` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `position` on the `ReservationItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "LightingPosition" AS ENUM ('FAROL_BAIXO', 'FAROL_ALTO', 'NEBLINA', 'LANTERNA_DIANTEIRA', 'PISCA_DIANTEIRO', 'PISCA_LATERAL', 'LANTERNA_TRASEIRA', 'PISCA_TRASEIRO', 'LUZ_FREIO', 'RE', 'TETO', 'PLACA', 'DRL');

-- DropForeignKey
ALTER TABLE "LedCompatibility" DROP CONSTRAINT "LedCompatibility_ledModelId_fkey";

-- DropForeignKey
ALTER TABLE "LedCompatibility" DROP CONSTRAINT "LedCompatibility_vehicleModelId_fkey";

-- AlterTable
ALTER TABLE "LedModel" ADD COLUMN     "socketCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ReservationItem" DROP COLUMN "position",
ADD COLUMN     "position" "LightingPosition" NOT NULL;

-- DropTable
DROP TABLE "LedCompatibility";

-- DropEnum
DROP TYPE "HeadlightPosition";

-- CreateTable
CREATE TABLE "VehicleFitting" (
    "id" TEXT NOT NULL,
    "vehicleModelId" TEXT NOT NULL,
    "position" "LightingPosition" NOT NULL,
    "socketCode" TEXT NOT NULL,

    CONSTRAINT "VehicleFitting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleFitting_socketCode_idx" ON "VehicleFitting"("socketCode");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleFitting_vehicleModelId_position_socketCode_key" ON "VehicleFitting"("vehicleModelId", "position", "socketCode");

-- CreateIndex
CREATE INDEX "LedModel_socketCode_idx" ON "LedModel"("socketCode");

-- AddForeignKey
ALTER TABLE "VehicleFitting" ADD CONSTRAINT "VehicleFitting_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
