-- Habilitar pgvector
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "KnowledgeDocumentType" AS ENUM ('FAQ', 'DOCUMENTO', 'CONTRATO', 'PLAN', 'TICKET', 'COBRO', 'OTRO');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');

-- CreateEnum
CREATE TYPE "ChatChannel" AS ENUM ('WHATSAPP', 'WEB', 'TELEGRAM', 'SMS', 'OTHER');

-- CreateEnum
CREATE TYPE "ChatSessionStatus" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Empresa" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nombre" TEXT,
    "telefono" TEXT NOT NULL,
    "uuid" TEXT,
    "crmUsuarioId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "clienteId" INTEGER,
    "telefono" TEXT NOT NULL,
    "canal" "ChatChannel" NOT NULL,
    "estado" "ChatSessionStatus" NOT NULL DEFAULT 'OPEN',
    "ultimoTicketCrmId" TEXT,
    "ultimoTicketCreadoEn" TIMESTAMP(3),
    "iniciadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "rol" "ChatRole" NOT NULL,
    "contenido" TEXT NOT NULL,
    "tokens" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeDocument" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "tipo" "KnowledgeDocumentType" NOT NULL,
    "externoId" TEXT,
    "origen" TEXT,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "idioma" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "indice" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "embedding" vector(4096) NOT NULL,
    "tokens" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_slug_key" ON "Empresa"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_uuid_key" ON "Cliente"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_empresaId_telefono_key" ON "Cliente"("empresaId", "telefono");

-- CreateIndex
CREATE INDEX "ChatSession_empresaId_telefono_canal_estado_idx" ON "ChatSession"("empresaId", "telefono", "canal", "estado");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_creadoEn_idx" ON "ChatMessage"("sessionId", "creadoEn");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_empresaId_tipo_idx" ON "KnowledgeDocument"("empresaId", "tipo");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_documentId_indice_idx" ON "KnowledgeChunk"("documentId", "indice");

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
