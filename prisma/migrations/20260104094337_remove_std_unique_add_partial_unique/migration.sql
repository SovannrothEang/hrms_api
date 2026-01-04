-- DropIndex
DROP INDEX "users_email_key";

-- DropIndex
DROP INDEX "users_username_key";

-- CreateIndex
CREATE UNIQUE INDEX "users_username_unique_active" ON "users"("username") WHERE "is_deleted" = false;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_unique_active" ON "users"("email") WHERE "is_deleted" = false;
