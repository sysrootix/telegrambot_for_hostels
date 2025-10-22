-- Add commissionPercent field to users for storing payout percentage
ALTER TABLE "User"
ADD COLUMN "commissionPercent" DOUBLE PRECISION;
