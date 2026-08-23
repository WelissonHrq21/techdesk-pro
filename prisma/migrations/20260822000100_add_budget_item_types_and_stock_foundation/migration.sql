-- CreateEnum
CREATE TYPE "BudgetItemType" AS ENUM ('PART', 'SERVICE');

-- Add nullable columns first so existing installations can be backfilled safely.
ALTER TABLE "BudgetItem"
ADD COLUMN "type" "BudgetItemType",
ADD COLUMN "description" TEXT;

-- Every legacy BudgetItem belongs to a Part, so it is a PART item. The Part
-- name becomes the immutable historical description snapshot.
UPDATE "BudgetItem" AS budget_item
SET "type" = 'PART',
    "description" = part."name"
FROM "Part" AS part
WHERE part."id" = budget_item."partId";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "BudgetItem"
    WHERE "type" IS NULL OR "description" IS NULL
  ) THEN
    RAISE EXCEPTION 'BudgetItem legacy backfill failed';
  END IF;
END
$$;

ALTER TABLE "BudgetItem"
ALTER COLUMN "type" SET DEFAULT 'PART',
ALTER COLUMN "type" SET NOT NULL,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "partId" DROP NOT NULL;

-- Existing stock quantities remain unchanged. Zero means no positive minimum
-- has been configured for the Part.
ALTER TABLE "Part"
ADD COLUMN "minimumStock" INTEGER NOT NULL DEFAULT 0;

-- Abort rather than modifying existing data if a legacy database contains
-- duplicate versions for the same Service Order.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Budget"
    GROUP BY "serviceOrderId", "version"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate Budget version found for ServiceOrder';
  END IF;
END
$$;

-- The compound unique index also serves lookups by serviceOrderId, so replace
-- the previous single-column index instead of keeping a redundant index.
DROP INDEX "Budget_serviceOrderId_idx";
CREATE UNIQUE INDEX "Budget_serviceOrderId_version_key"
ON "Budget"("serviceOrderId", "version");

-- The compound index keeps the existing part lookup prefix and supports the
-- chronological stock-history query.
DROP INDEX "StockMovement_partId_idx";
CREATE INDEX "StockMovement_partId_createdAt_idx"
ON "StockMovement"("partId", "createdAt");
