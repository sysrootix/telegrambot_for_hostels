-- Adds boolean flag to mark users as partners/leaders
ALTER TABLE "User"
ADD COLUMN "isPartner" BOOLEAN NOT NULL DEFAULT FALSE;
