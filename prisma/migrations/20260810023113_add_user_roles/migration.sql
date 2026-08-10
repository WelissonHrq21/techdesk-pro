/*
  Warnings:

  - Changed the type of `role` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'RECEPTION', 'TECHNICIAN');

-- Normalize existing legacy role values before converting the column.
UPDATE "User"
SET "role" = 'TECHNICIAN'
WHERE "role" = 'TECH';

-- AlterTable
ALTER TABLE "User"
ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";
