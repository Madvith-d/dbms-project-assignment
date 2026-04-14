-- CreateEnum
CREATE TYPE "ActivityEntityType" AS ENUM ('TASK', 'PROJECT', 'MILESTONE', 'COMMENT', 'ATTACHMENT');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM (
  'CREATED',
  'UPDATED',
  'DELETED',
  'STATUS_CHANGED',
  'ASSIGNED',
  'COMMENTED',
  'UPLOADED_ATTACHMENT',
  'LOGGED_TIME',
  'LABELS_UPDATED'
);

-- AlterTable
ALTER TABLE "Task"
ADD COLUMN "sort_order" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ActivityLog" (
  "activity_id" SERIAL NOT NULL,
  "project_id" INTEGER NOT NULL,
  "actor_user_id" INTEGER NOT NULL,
  "entity_type" "ActivityEntityType" NOT NULL,
  "entity_id" INTEGER NOT NULL,
  "action" "ActivityAction" NOT NULL,
  "summary" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("activity_id")
);

-- CreateTable
CREATE TABLE "Label" (
  "label_id" SERIAL NOT NULL,
  "project_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Label_pkey" PRIMARY KEY ("label_id")
);

-- CreateTable
CREATE TABLE "TaskLabel" (
  "task_id" INTEGER NOT NULL,
  "label_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskLabel_pkey" PRIMARY KEY ("task_id", "label_id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_project_id_created_at_idx" ON "ActivityLog"("project_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Label_project_id_name_key" ON "Label"("project_id", "name");

-- CreateIndex
CREATE INDEX "TaskLabel_label_id_idx" ON "TaskLabel"("label_id");

-- AddForeignKey
ALTER TABLE "ActivityLog"
ADD CONSTRAINT "ActivityLog_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog"
ADD CONSTRAINT "ActivityLog_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Label"
ADD CONSTRAINT "Label_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskLabel"
ADD CONSTRAINT "TaskLabel_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskLabel"
ADD CONSTRAINT "TaskLabel_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "Label"("label_id") ON DELETE CASCADE ON UPDATE CASCADE;
