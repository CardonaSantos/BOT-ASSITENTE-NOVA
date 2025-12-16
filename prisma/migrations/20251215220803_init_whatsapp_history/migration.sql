-- CreateEnum
CREATE TYPE "WazDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "WazStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "WazMediaType" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'STICKER', 'LOCATION', 'TEMPLATE', 'INTERACTIVE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "WhatsappMessage" (
    "id" TEXT NOT NULL,
    "wamid" TEXT NOT NULL,
    "chatSessionId" INTEGER,
    "clienteId" INTEGER,
    "direction" "WazDirection" NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "type" "WazMediaType" NOT NULL,
    "body" TEXT,
    "mediaUrl" TEXT,
    "mediaMimeType" TEXT,
    "mediaSha256" TEXT,
    "status" "WazStatus" NOT NULL DEFAULT 'SENT',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "replyToWamid" TEXT,
    "timestamp" BIGINT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappMessage_wamid_key" ON "WhatsappMessage"("wamid");

-- CreateIndex
CREATE INDEX "WhatsappMessage_wamid_idx" ON "WhatsappMessage"("wamid");

-- CreateIndex
CREATE INDEX "WhatsappMessage_clienteId_idx" ON "WhatsappMessage"("clienteId");

-- CreateIndex
CREATE INDEX "WhatsappMessage_status_idx" ON "WhatsappMessage"("status");

-- AddForeignKey
ALTER TABLE "WhatsappMessage" ADD CONSTRAINT "WhatsappMessage_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "ChatSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappMessage" ADD CONSTRAINT "WhatsappMessage_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
