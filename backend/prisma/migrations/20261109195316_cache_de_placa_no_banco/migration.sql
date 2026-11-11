-- CreateTable
CREATE TABLE "PlateCache" (
    "plate" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlateCache_pkey" PRIMARY KEY ("plate")
);

-- CreateIndex
CREATE INDEX "PlateCache_expiresAt_idx" ON "PlateCache"("expiresAt");
