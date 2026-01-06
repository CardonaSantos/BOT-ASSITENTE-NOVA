-- CreateEnum
CREATE TYPE "ChatFlowIntent" AS ENUM ('NONE', 'SOPORTE', 'VENTAS', 'FACTURACION', 'TIENDA', 'INFORMACION');

-- CreateEnum
CREATE TYPE "ChatFlowStep" AS ENUM ('NONE', 'IDENTIFICACION', 'DIAGNOSTICO', 'CONFIRMACION', 'ACCION', 'CIERRE');

-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN     "flowContext" JSONB,
ADD COLUMN     "flowIntent" "ChatFlowIntent" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "flowStep" "ChatFlowStep" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "ticketCreado" BOOLEAN NOT NULL DEFAULT false;
