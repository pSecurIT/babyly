-- Custom emails become reusable templates; every send gets its own log row.
-- The old one-shot recipient log is dropped (the feature was not yet in use).
DROP TABLE "custom_email_recipients";

ALTER TABLE "custom_emails" DROP COLUMN "status", DROP COLUMN "sentAt";

DROP TYPE "CustomEmailStatus";

-- CreateTable
CREATE TABLE "custom_email_sends" (
    "id" TEXT NOT NULL,
    "customEmailId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "sentBy" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_email_sends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_email_recipients" (
    "id" TEXT NOT NULL,
    "sendId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_email_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_email_sends_customEmailId_idx" ON "custom_email_sends"("customEmailId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_email_recipients_sendId_email_key" ON "custom_email_recipients"("sendId", "email");

-- AddForeignKey
ALTER TABLE "custom_email_sends" ADD CONSTRAINT "custom_email_sends_customEmailId_fkey" FOREIGN KEY ("customEmailId") REFERENCES "custom_emails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_email_recipients" ADD CONSTRAINT "custom_email_recipients_sendId_fkey" FOREIGN KEY ("sendId") REFERENCES "custom_email_sends"("id") ON DELETE CASCADE ON UPDATE CASCADE;
