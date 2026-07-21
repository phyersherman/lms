-- AlterTable
ALTER TABLE "Form" ADD COLUMN "import_key" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "import_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Form_tenant_id_import_key_key" ON "Form"("tenant_id", "import_key");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenant_id_import_key_key" ON "Product"("tenant_id", "import_key");
