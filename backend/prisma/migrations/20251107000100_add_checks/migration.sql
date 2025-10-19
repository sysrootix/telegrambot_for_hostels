-- Create table for storing checks/receipts per user
CREATE TABLE "Check" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12, 2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Check_pkey" PRIMARY KEY ("id")
);

-- Establish relation with users
ALTER TABLE "Check"
ADD CONSTRAINT "Check_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Helpful index for chronological queries per user
CREATE INDEX "Check_userId_createdAt_idx" ON "Check" ("userId", "createdAt");

-- Trigger to maintain updatedAt column
CREATE TRIGGER check_set_updated_at
    BEFORE UPDATE ON "Check"
    FOR EACH ROW
    EXECUTE FUNCTION prisma_set_updated_at();
