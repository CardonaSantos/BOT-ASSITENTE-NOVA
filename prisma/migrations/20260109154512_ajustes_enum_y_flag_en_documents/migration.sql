/*
  Warnings:

  - You are about to drop the column `ticketCreado` on the `ChatSession` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "KnowledgeDocumentType" ADD VALUE 'PROTOCOLO';
ALTER TYPE "KnowledgeDocumentType" ADD VALUE 'FUNCION';

-- AlterTable
ALTER TABLE "ChatSession" DROP COLUMN "ticketCreado";

-- AlterTable
ALTER TABLE "KnowledgeDocument" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;
