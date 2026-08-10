/*
  Warnings:

  - A unique constraint covering the columns `[serialNumber]` on the table `Equipment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Equipment" ALTER COLUMN "serialNumber" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_serialNumber_key" ON "Equipment"("serialNumber");
