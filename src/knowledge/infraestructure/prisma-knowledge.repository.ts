import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeRepository } from '../domain/knowledge.repository';
import { Knowledge } from '../entities/knowledge.entity';
import { throwFatalError } from 'src/Utils/CommonFatalError';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';
import { KnowledgeDocument, Prisma } from '@prisma/client';
import { splitTextRag } from 'src/Utils/splitterText';
import { FireworksIaService } from 'src/fireworks-ia/app/fireworks-ia.service';

@Injectable()
export class PrismaKnowledgeRepository implements KnowledgeRepository {
  private readonly logger = new Logger(PrismaKnowledgeRepository.name);

  constructor(
    private readonly prisma: PrismaService,

    private readonly fireworksIa: FireworksIaService,
  ) {}

  // Mapea fila de Prisma -> Entidad de dominio
  private toDomain(row: KnowledgeDocument | null): Knowledge | null {
    if (!row) return null;

    return new Knowledge(
      row.id,
      row.empresaId,
      row.tipo,
      row.externoId, // string | null
      row.origen,
      row.titulo,
      row.descripcion ?? undefined,
      row.textoLargo ?? undefined,
      row.creadoEn,
      row.actualizadoEn,
    );
  }

  async create(knowledge: Knowledge): Promise<Knowledge> {
    try {
      if (!knowledge.textoLargo || !knowledge.textoLargo.trim()) {
        throw new Error(
          'El texto largo del documento de conocimiento no puede estar vacío',
        );
      }

      // 1) Chunking
      const chunks = splitTextRag(knowledge.textoLargo);
      this.logger.log(
        `Creando knowledge (${knowledge.tipo}) con ${chunks.length} chunks`,
      );

      if (chunks.length === 0) {
        throw new Error('No se generaron chunks válidos para el documento');
      }

      // 2) Embeddings (batch de 8)
      const embeddings: number[][] = [];

      for (let i = 0; i < chunks.length; i += 8) {
        const batch = chunks.slice(i, i + 8);
        const batchEmbeddings = await this.fireworksIa.embedMany(batch);
        embeddings.push(...batchEmbeddings);
      }

      if (chunks.length !== embeddings.length) {
        throw new Error(
          `Mismatch chunks (${chunks.length}) vs embeddings (${embeddings.length})`,
        );
      }

      // 3) TRANSACCIÓN COMPLETA
      const result = await this.prisma.$transaction(async (tx) => {
        // Crear documento
        const row = await tx.knowledgeDocument.create({
          data: {
            empresaId: knowledge.empresaId,
            tipo: knowledge.tipo,
            externoId: knowledge.externoId,
            origen: knowledge.origen,
            titulo: knowledge.titulo,
            descripcion: knowledge.descripcion,
            textoLargo: knowledge.textoLargo,
          },
        });

        // Insertar chunks usando el mismo tx
        await this.insertChunksTx(tx, row.id, chunks, embeddings);

        return row;
      });

      const domain = this.toDomain(result);
      if (!domain) {
        throw new Error('Error al crear KnowledgeDocument: resultado vacío');
      }

      return domain;
    } catch (error) {
      throwFatalError(error, this.logger, 'PrismaKnowledgeRepository - create');
    }
  }

  async deleteById(id: number): Promise<Knowledge | null> {
    try {
      const rowDeleted = await this.prisma.knowledgeDocument.delete({
        where: {
          id,
        },
      });

      return this.toDomain(rowDeleted);
    } catch (error) {
      throwFatalError(error, this.logger, 'PrismaKnowledgeRepository - delete');
    }
  }

  async findAllByEmpresa(empresaId: number): Promise<Knowledge[]> {
    try {
      const id = empresaId ? empresaId : 1;
      const rows = await this.prisma.knowledgeDocument.findMany({
        where: {
          id: id,
        },
      });

      const rowsFormatted = rows.map((r) => this.toDomain(r));
      return rowsFormatted;
    } catch (error) {
      throwFatalError(error, this.logger, 'PrismaKnowledgeRepository - delete');
    }
  }

  async findById(id: number): Promise<Knowledge | null> {
    try {
      const rowFound = await this.prisma.knowledgeDocument.findUnique({
        where: {
          id,
        },
      });

      return this.toDomain(rowFound);
    } catch (error) {
      throwFatalError(
        error,
        this.logger,
        'PrismaKnowledgeRepository - findById',
      );
    }
  }

  async update(id: number, data: Partial<Knowledge>): Promise<Knowledge> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.knowledgeDocument.findUnique({
          where: { id },
        });

        if (!existing) {
          throw new Error(`KnowledgeDocument ${id} no encontrado`);
        }

        const textoCambio =
          typeof data.textoLargo === 'string' &&
          data.textoLargo.trim() !== existing.textoLargo?.trim();

        // Update del documento
        const updated = await tx.knowledgeDocument.update({
          where: { id },
          data: {
            titulo: data.titulo,
            descripcion: data.descripcion,
            tipo: data.tipo,
            origen: data.origen,
            empresaId: data.empresaId,
            externoId: data.externoId,
            textoLargo: data.textoLargo,
          },
        });

        //  Si cambió el texto → REINDEXAR
        if (textoCambio) {
          // borrar chunks viejos
          await tx.knowledgeChunk.deleteMany({
            where: { documentId: id },
          });

          // chunking nuevo
          const chunks = splitTextRag(data.textoLargo!);

          if (chunks.length === 0) {
            throw new Error('No se generaron chunks válidos al actualizar');
          }

          // embeddings nuevos (batch de 8)
          const embeddings: number[][] = [];
          for (let i = 0; i < chunks.length; i += 8) {
            const batch = chunks.slice(i, i + 8);
            const batchEmbeddings = await this.fireworksIa.embedMany(batch);
            embeddings.push(...batchEmbeddings);
          }

          if (chunks.length !== embeddings.length) {
            throw new Error(
              `Mismatch chunks (${chunks.length}) vs embeddings (${embeddings.length})`,
            );
          }

          // insertar chunks nuevos
          await this.insertChunksTx(tx, id, chunks, embeddings);
        }

        return this.toDomain(updated)!;
      });
    } catch (error) {
      throwFatalError(error, this.logger, 'PrismaKnowledgeRepository - update');
    }
  }

  //CONOCIMIENTOS PARA CRM
  async findAll(): Promise<Knowledge[]> {
    try {
      const rows = await this.prisma.knowledgeDocument.findMany({});

      const rowsFormatted = rows.map((r) => this.toDomain(r));

      return rowsFormatted;
    } catch (error) {
      throwFatalError(
        error,
        this.logger,
        'PrismaKnowledgeRepository - findAllCrm',
      );
    }
  }

  private async insertChunksTx(
    tx: Prisma.TransactionClient,
    documentId: number,
    chunks: string[],
    embeddings: number[][],
  ): Promise<void> {
    for (let i = 0; i < chunks.length; i++) {
      const texto = chunks[i];
      const embedding = embeddings[i];
      const tokensApprox = Math.round(texto.length / 4);

      await tx.$executeRaw`
      INSERT INTO "KnowledgeChunk"
        ("documentId", "indice", "texto", "embedding", "tokens", "creadoEn", "actualizadoEn")
      VALUES
        (${documentId}, ${i}, ${texto}, ${JSON.stringify(
          embedding,
        )}::vector, ${tokensApprox}, NOW(), NOW())
    `;
    }
  }
}
