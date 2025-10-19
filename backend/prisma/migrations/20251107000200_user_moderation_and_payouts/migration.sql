ALTER TABLE "User"
ADD COLUMN "payoutUsdtTrc20" TEXT,
ADD COLUMN "payoutUsdtBep20" TEXT,
ADD COLUMN "chatId" TEXT,
ADD COLUMN "mutedUntil" TIMESTAMP(3),
ADD COLUMN "isBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "blockReason" TEXT;

-- migrate existing payoutDetails into TRC20 field if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'payoutDetails'
  ) THEN
    EXECUTE 'UPDATE "User" SET "payoutUsdtTrc20" = "payoutDetails" WHERE "payoutDetails" IS NOT NULL';
    EXECUTE 'ALTER TABLE "User" DROP COLUMN "payoutDetails"';
  END IF;
END;
$$ LANGUAGE plpgsql;
