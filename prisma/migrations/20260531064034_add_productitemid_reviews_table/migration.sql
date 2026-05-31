/*
  Warnings:

  - You are about to drop the column `order_id` on the `Reviews` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[order_item_id,variant_id]` on the table `Reviews` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `order_item_id` to the `Reviews` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Reviews" DROP CONSTRAINT "Reviews_order_id_fkey";

-- DropIndex
DROP INDEX "Reviews_order_id_variant_id_key";

-- AlterTable
ALTER TABLE "Reviews" DROP COLUMN "order_id",
ADD COLUMN     "order_item_id" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Reviews_order_item_id_variant_id_key" ON "Reviews"("order_item_id", "variant_id");

-- AddForeignKey
ALTER TABLE "Reviews" ADD CONSTRAINT "Reviews_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "OrderItems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
