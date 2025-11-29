/*
  Warnings:

  - You are about to drop the column `idioma` on the `KnowledgeDocument` table. All the data in the column will be lost.
  - The `externoId` column on the `KnowledgeDocument` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "KnowledgeDocument" DROP COLUMN "idioma",
DROP COLUMN "externoId",
ADD COLUMN     "externoId" INTEGER;
