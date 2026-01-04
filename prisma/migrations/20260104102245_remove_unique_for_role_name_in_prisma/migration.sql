-- DropIndex
DROP INDEX "roles_name_key";

-- CreateIndex for Database Level
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name") WHERE "is_deleted" = false;
