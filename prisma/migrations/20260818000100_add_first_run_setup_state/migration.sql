-- Add persisted first-run setup state to the existing singleton company settings.
ALTER TABLE "CompanySettings" ADD COLUMN "singletonKey" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "CompanySettings" ADD COLUMN "setupCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CompanySettings" ADD COLUMN "setupCompletedAt" TIMESTAMP(3);

-- Keep the canonical singleton row as "default" and make accidental legacy duplicates unique.
WITH ranked_settings AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS row_number
  FROM "CompanySettings"
)
UPDATE "CompanySettings"
SET "singletonKey" = CASE
  WHEN ranked_settings.row_number = 1 THEN 'default'
  ELSE "CompanySettings"."id"
END
FROM ranked_settings
WHERE "CompanySettings"."id" = ranked_settings."id";

-- Existing installations that already have company settings have already passed first-run setup.
UPDATE "CompanySettings"
SET "setupCompleted" = true,
    "setupCompletedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP)
WHERE "setupCompleted" = false;

-- Existing operational databases without a CompanySettings row should not be forced into onboarding.
INSERT INTO "CompanySettings" (
  "id",
  "singletonKey",
  "name",
  "setupCompleted",
  "setupCompletedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  'default',
  '',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "CompanySettings")
  AND (
    EXISTS (SELECT 1 FROM "Customer")
    OR EXISTS (SELECT 1 FROM "Equipment")
    OR EXISTS (SELECT 1 FROM "ServiceOrder")
    OR EXISTS (SELECT 1 FROM "Part")
    OR EXISTS (SELECT 1 FROM "Budget")
    OR EXISTS (SELECT 1 FROM "StockMovement")
  );

CREATE UNIQUE INDEX "CompanySettings_singletonKey_key" ON "CompanySettings"("singletonKey");
