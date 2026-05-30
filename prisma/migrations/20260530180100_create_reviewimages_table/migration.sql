/*
  Warnings:

  - A unique constraint covering the columns `[order_id,variant_id]` on the table `Reviews` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Products" ADD COLUMN     "avg_rating" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "total_reviews" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Reviews" ADD COLUMN     "edit_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "is_edited" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ReviewImages" (
    "id" SERIAL NOT NULL,
    "review_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,

    CONSTRAINT "ReviewImages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reviews_product_id_created_at_idx" ON "Reviews"("product_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "Reviews_variant_id_created_at_idx" ON "Reviews"("variant_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Reviews_order_id_variant_id_key" ON "Reviews"("order_id", "variant_id");

-- AddForeignKey
ALTER TABLE "ReviewImages" ADD CONSTRAINT "ReviewImages_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "Reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
