-- CreateEnum
CREATE TYPE "CustomEmailStatus" AS ENUM ('draft', 'sent');

-- CreateTable
CREATE TABLE "email_templates" (
    "key" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "custom_emails" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "status" "CustomEmailStatus" NOT NULL DEFAULT 'draft',
    "createdBy" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_email_recipients" (
    "id" TEXT NOT NULL,
    "customEmailId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_email_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custom_email_recipients_customEmailId_email_key" ON "custom_email_recipients"("customEmailId", "email");

-- AddForeignKey
ALTER TABLE "custom_email_recipients" ADD CONSTRAINT "custom_email_recipients_customEmailId_fkey" FOREIGN KEY ("customEmailId") REFERENCES "custom_emails"("id") ON DELETE CASCADE ON UPDATE CASCADE;
