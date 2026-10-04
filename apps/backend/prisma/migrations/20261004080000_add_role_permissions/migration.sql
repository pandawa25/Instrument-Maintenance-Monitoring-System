-- CreateEnum
CREATE TYPE "PermissionModule" AS ENUM ('DASHBOARD', 'AREA', 'EQUIPMENT', 'INSTRUMENT_NAME', 'CORRECTIVE_MAINTENANCE', 'VENDOR', 'PM_ACTIVITY_TYPE', 'PM_PROGRAM', 'PM_EXECUTION', 'SPARE_PART');

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "module" "PermissionModule" NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT false,
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_module_key" ON "role_permissions"("role_id", "module");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
