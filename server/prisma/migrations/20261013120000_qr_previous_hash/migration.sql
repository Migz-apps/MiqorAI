-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "qr_prev_code_hash" TEXT,
ADD COLUMN     "qr_prev_updated_at" TIMESTAMP(3);

