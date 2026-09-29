-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PmProgramStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PmFrequencyUnit" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "PmExecutionResult" AS ENUM ('OK', 'NOT_OK');

-- CreateEnum
CREATE TYPE "PmChecklistResult" AS ENUM ('OK', 'NOT_OK', 'NA');

-- CreateEnum
CREATE TYPE "PmExecutionStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "contact_person" VARCHAR(100),
    "phone" VARCHAR(30),
    "email" VARCHAR(150),
    "address" VARCHAR(255),
    "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "remarks" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_activity_types" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pm_activity_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_programs" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "frequency_value" INTEGER NOT NULL,
    "frequency_unit" "PmFrequencyUnit" NOT NULL,
    "vendor_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "status" "PmProgramStatus" NOT NULL DEFAULT 'ACTIVE',
    "remarks" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pm_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_program_equipment" (
    "id" UUID NOT NULL,
    "pm_program_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pm_program_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_checklist_items" (
    "id" UUID NOT NULL,
    "pm_program_id" UUID NOT NULL,
    "activity_type_id" UUID NOT NULL,
    "description" VARCHAR(255),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pm_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_periods" (
    "id" UUID NOT NULL,
    "pm_program_id" UUID NOT NULL,
    "period_number" INTEGER NOT NULL,
    "planned_date" DATE NOT NULL,
    "remarks" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pm_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_period_executions" (
    "id" UUID NOT NULL,
    "pm_period_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "execution_date" DATE,
    "result" "PmExecutionResult",
    "findings" VARCHAR(1000),
    "action_taken" VARCHAR(1000),
    "vendor_personnel" VARCHAR(150),
    "status" "PmExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pm_period_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm_execution_checklist_results" (
    "id" UUID NOT NULL,
    "pm_period_execution_id" UUID NOT NULL,
    "activity_type_name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "result" "PmChecklistResult" NOT NULL DEFAULT 'NA',
    "notes" VARCHAR(500),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pm_execution_checklist_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendors_status_idx" ON "vendors"("status");

-- CreateIndex
CREATE UNIQUE INDEX "pm_activity_types_code_key" ON "pm_activity_types"("code");

-- CreateIndex
CREATE INDEX "pm_programs_vendor_id_idx" ON "pm_programs"("vendor_id");

-- CreateIndex
CREATE INDEX "pm_programs_status_idx" ON "pm_programs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "pm_program_equipment_pm_program_id_equipment_id_key" ON "pm_program_equipment"("pm_program_id", "equipment_id");

-- CreateIndex
CREATE INDEX "pm_program_equipment_equipment_id_idx" ON "pm_program_equipment"("equipment_id");

-- CreateIndex
CREATE INDEX "pm_checklist_items_pm_program_id_idx" ON "pm_checklist_items"("pm_program_id");

-- CreateIndex
CREATE UNIQUE INDEX "pm_periods_pm_program_id_period_number_key" ON "pm_periods"("pm_program_id", "period_number");

-- CreateIndex
CREATE INDEX "pm_periods_planned_date_idx" ON "pm_periods"("planned_date");

-- CreateIndex
CREATE UNIQUE INDEX "pm_period_executions_pm_period_id_equipment_id_key" ON "pm_period_executions"("pm_period_id", "equipment_id");

-- CreateIndex
CREATE INDEX "pm_period_executions_equipment_id_idx" ON "pm_period_executions"("equipment_id");

-- CreateIndex
CREATE INDEX "pm_period_executions_status_idx" ON "pm_period_executions"("status");

-- CreateIndex
CREATE INDEX "pm_execution_checklist_results_pm_period_execution_id_idx" ON "pm_execution_checklist_results"("pm_period_execution_id");

-- AddForeignKey
ALTER TABLE "pm_programs" ADD CONSTRAINT "pm_programs_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_program_equipment" ADD CONSTRAINT "pm_program_equipment_pm_program_id_fkey" FOREIGN KEY ("pm_program_id") REFERENCES "pm_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_program_equipment" ADD CONSTRAINT "pm_program_equipment_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_checklist_items" ADD CONSTRAINT "pm_checklist_items_pm_program_id_fkey" FOREIGN KEY ("pm_program_id") REFERENCES "pm_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_checklist_items" ADD CONSTRAINT "pm_checklist_items_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "pm_activity_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_periods" ADD CONSTRAINT "pm_periods_pm_program_id_fkey" FOREIGN KEY ("pm_program_id") REFERENCES "pm_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_period_executions" ADD CONSTRAINT "pm_period_executions_pm_period_id_fkey" FOREIGN KEY ("pm_period_id") REFERENCES "pm_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_period_executions" ADD CONSTRAINT "pm_period_executions_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm_execution_checklist_results" ADD CONSTRAINT "pm_execution_checklist_results_pm_period_execution_id_fkey" FOREIGN KEY ("pm_period_execution_id") REFERENCES "pm_period_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
