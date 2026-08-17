-- Add nullable customer CPF/CNPJ document. Existing customers keep NULL.
ALTER TABLE "Customer" ADD COLUMN "document" TEXT;

-- PostgreSQL unique indexes allow multiple NULL values.
CREATE UNIQUE INDEX "Customer_document_key" ON "Customer"("document");
