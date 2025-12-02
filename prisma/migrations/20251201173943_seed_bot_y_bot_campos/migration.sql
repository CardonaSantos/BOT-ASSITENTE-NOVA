-- CreateEnum
CREATE TYPE "BotStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN     "botId" INTEGER;

-- CreateTable
CREATE TABLE "Bot" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'fireworks',
    "model" TEXT NOT NULL DEFAULT 'accounts/fireworks/models/gpt-oss-120b',
    "systemPrompt" TEXT NOT NULL,
    "contextPrompt" TEXT,
    "historyPrompt" TEXT,
    "outputStyle" TEXT,
    "maxCompletionTokens" INTEGER DEFAULT 500,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "topP" DOUBLE PRECISION DEFAULT 0.9,
    "frequencyPenalty" DOUBLE PRECISION DEFAULT 0.2,
    "presencePenalty" DOUBLE PRECISION DEFAULT 0.0,
    "maxHistoryMessages" INTEGER DEFAULT 15,
    "status" "BotStatus" NOT NULL DEFAULT 'ACTIVE',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bot_slug_key" ON "Bot"("slug");

-- AddForeignKey
ALTER TABLE "Bot" ADD CONSTRAINT "Bot_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
