-- CreateEnum
CREATE TYPE "AreaStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('ACTIVE', 'STANDBY', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "Criticality" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "FailureCategory" AS ENUM ('INSTRUMENT', 'ELECTRICAL', 'MECHANICAL', 'COMMUNICATION', 'CONFIGURATION', 'CALIBRATION', 'PROCESS');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "role_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" UUID NOT NULL,
    "area_code" VARCHAR(20) NOT NULL,
    "area_name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(255),
    "status" "AreaStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument_names" (
    "id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "instrument_names_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" UUID NOT NULL,
    "tag_number" VARCHAR(50) NOT NULL,
    "service" VARCHAR(150) NOT NULL,
    "description" VARCHAR(255),
    "area_id" UUID NOT NULL,
    "instrument_name_id" UUID NOT NULL,
    "type" VARCHAR(100),
    "manufacturer" VARCHAR(100),
    "model" VARCHAR(100),
    "serial_number" VARCHAR(100),
    "installation_date" DATE,
    "lrv" DECIMAL(14,4),
    "urv" DECIMAL(14,4),
    "unit" VARCHAR(20),
    "status" "EquipmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "criticality" "Criticality" NOT NULL DEFAULT 'MEDIUM',
    "remarks" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrective_maintenance" (
    "id" UUID NOT NULL,
    "maintenance_date" DATE NOT NULL,
    "equipment_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "failure_category" "FailureCategory" NOT NULL,
    "problem_description" VARCHAR(1000) NOT NULL,
    "root_cause" VARCHAR(1000),
    "action_taken" VARCHAR(1000),
    "downtime_hours" DECIMAL(6,2),
    "technician_id" UUID NOT NULL,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "completion_date" DATE,
    "created_by_id" UUID NOT NULL,
    "remarks" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "corrective_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "areas_area_code_key" ON "areas"("area_code");

-- CreateIndex
CREATE INDEX "areas_status_idx" ON "areas"("status");

-- CreateIndex
CREATE UNIQUE INDEX "instrument_names_code_key" ON "instrument_names"("code");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_tag_number_key" ON "equipment"("tag_number");

-- CreateIndex
CREATE INDEX "equipment_area_id_idx" ON "equipment"("area_id");

-- CreateIndex
CREATE INDEX "equipment_instrument_name_id_idx" ON "equipment"("instrument_name_id");

-- CreateIndex
CREATE INDEX "equipment_status_idx" ON "equipment"("status");

-- CreateIndex
CREATE INDEX "equipment_area_id_status_idx" ON "equipment"("area_id", "status");

-- CreateIndex
CREATE INDEX "corrective_maintenance_maintenance_date_idx" ON "corrective_maintenance"("maintenance_date");

-- CreateIndex
CREATE INDEX "corrective_maintenance_equipment_id_idx" ON "corrective_maintenance"("equipment_id");

-- CreateIndex
CREATE INDEX "corrective_maintenance_area_id_idx" ON "corrective_maintenance"("area_id");

-- CreateIndex
CREATE INDEX "corrective_maintenance_status_idx" ON "corrective_maintenance"("status");

-- CreateIndex
CREATE INDEX "corrective_maintenance_area_id_maintenance_date_idx" ON "corrective_maintenance"("area_id", "maintenance_date");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_instrument_name_id_fkey" FOREIGN KEY ("instrument_name_id") REFERENCES "instrument_names"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_maintenance" ADD CONSTRAINT "corrective_maintenance_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_maintenance" ADD CONSTRAINT "corrective_maintenance_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_maintenance" ADD CONSTRAINT "corrective_maintenance_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_maintenance" ADD CONSTRAINT "corrective_maintenance_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
