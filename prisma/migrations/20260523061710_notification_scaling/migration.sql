/*
  Warnings:

  - You are about to drop the column `is_read` on the `Notifications` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `Notifications` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('android', 'ios', 'web');

-- DropForeignKey
ALTER TABLE "Notifications" DROP CONSTRAINT "Notifications_user_id_fkey";

-- AlterTable
ALTER TABLE "Notifications" DROP COLUMN "is_read",
DROP COLUMN "user_id",
ADD COLUMN     "metadata" JSONB;

-- CreateTable
CREATE TABLE "UserNotifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "notification_id" INTEGER NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserNotifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFcmTokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "device_type" "DevicePlatform" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFcmTokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserNotifications_user_id_is_read_idx" ON "UserNotifications"("user_id", "is_read");

-- CreateIndex
CREATE UNIQUE INDEX "UserFcmTokens_token_key" ON "UserFcmTokens"("token");

-- CreateIndex
CREATE INDEX "UserFcmTokens_user_id_idx" ON "UserFcmTokens"("user_id");

-- AddForeignKey
ALTER TABLE "UserNotifications" ADD CONSTRAINT "UserNotifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotifications" ADD CONSTRAINT "UserNotifications_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "Notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFcmTokens" ADD CONSTRAINT "UserFcmTokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
