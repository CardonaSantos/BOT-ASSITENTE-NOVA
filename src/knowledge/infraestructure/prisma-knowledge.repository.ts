import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeRepository } from '../domain/knowledge.repository';
import { Knowledge } from '../entities/knowledge.entity';
import { throwFatalError } from 'src/Utils/CommonFatalError';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';
import { KnowledgeDocument } from '@prisma/client';
import { splitText } from 'src/Utils/splitterText';
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

      // 1) Chunks a partir de textoLargo
      const chunks = splitText(knowledge.textoLargo);

      // 2) Embeddings (modelo transformador)
      const embeddings = await this.fireworksIa.embedMany(chunks);

      // 3) Crear KnowledgeDocument (guardamos resumen + textoLargo completo)
      const row = await this.prisma.knowledgeDocument.create({
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

      // 4) Insertar chunks + embeddings
      await this.insertChunks(row.id, chunks, embeddings);

      const domain = this.toDomain(row);
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
      const rowToUpdate = await this.prisma.knowledgeDocument.update({
        where: {
          id,
        },
        data: {
          titulo: data.titulo,
          descripcion: data.descripcion,
          textoLargo: data.textoLargo,
          tipo: data.tipo,
          origen: data.origen,
          empresaId: data.empresaId,
          externoId: data.externoId,
        },
      });

      return this.toDomain(rowToUpdate);
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

  private async insertChunks(
    documentId: number,
    chunks: string[],
    embeddings: number[][],
  ): Promise<void> {
    try {
      for (let i = 0; i < chunks.length; i++) {
        const texto = chunks[i];
        const embedding = embeddings[i];

        if (!embedding) {
          throw new Error(
            `No se encontró embedding para el chunk con índice ${i}`,
          );
        }

        const embeddingJson = JSON.stringify(embedding);
        const tokensApprox = Math.round(texto.length / 4);

        await this.prisma.$executeRaw`
        INSERT INTO "KnowledgeChunk"
          ("documentId", "indice", "texto", "embedding", "tokens", "creadoEn", "actualizadoEn")
        VALUES
          (${documentId}, ${i}, ${texto}, ${embeddingJson}::vector, ${tokensApprox}, NOW(), NOW());
      `;
      }
    } catch (error) {
      throwFatalError(
        error,
        this.logger,
        'PrismaKnowledgeRepository - insertChunks',
      );
    }
  }
}
