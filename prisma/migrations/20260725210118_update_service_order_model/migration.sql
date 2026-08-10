/*
  Warnings:

  - The `status` column on the `ServiceOrder` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[number]` on the table `ServiceOrder` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `customerId` to the `ServiceOrder` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ServiceOrderStatus" AS ENUM ('RECEIVED', 'IN_ANALYSIS', 'AWAITING_APPROVAL', 'BUDGET_APPROVED', 'BUDGET_REJECTED', 'IN_MAINTENANCE', 'FINISHED', 'AWAITING_PICKUP', 'DELIVERED', 'CANCELLED');

-- AlterTable
ALTER TABLE "ServiceOrder" ADD COLUMN     "customerId" TEXT NOT NULL,
ADD COLUMN     "number" SERIAL NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ServiceOrderStatus" NOT NULL DEFAULT 'RECEIVED';

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOrder_number_key" ON "ServiceOrder"("number");

-- AddForeignKey
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
