// src/knowledge/app/knowledge.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';
import { KnowledgeDocumentType } from '@prisma/client';
import { FireworksIaService } from 'src/fireworks-ia/app/fireworks-ia.service';

export interface KnowledgeSearchResult {
  id: number;
  texto: string;
  documentId: number;
  indice: number;
  titulo: string;
  tipo: KnowledgeDocumentType;
}

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fireworksIa: FireworksIaService,
  ) {}

  /**
   * Crea un documento de conocimiento y genera chunks + embeddings.
   */
  async createDocumentWithChunks(opts: {
    empresaId: number;
    tipo: KnowledgeDocumentType;
    titulo: string;
    descripcion?: string;
    idioma?: string;
    textoLargo: string;
  }) {
    const { empresaId, tipo, titulo, descripcion, idioma, textoLargo } = opts;

    // 1) Crear documento
    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        empresaId,
        tipo,
        titulo,
        descripcion,
        idioma,
      },
    });

    // 2) Partir texto en chunks
    const chunks = this.chunkText(textoLargo, 800); // 800 chars aprox

    // 3) Por cada chunk: embedding + insert con pgvector
    let indice = 0;
    for (const texto of chunks) {
      indice++;

      const embedding = await this.fireworksIa.getEmbedding(texto); // debes tener este método
      const vectorLiteral = JSON.stringify(embedding); // "[...]" para usar ::vector

      await this.prisma.$executeRawUnsafe(
        `
        INSERT INTO "KnowledgeChunk" ("documentId", "indice", "texto", "embedding")
        VALUES ($1, $2, $3, $4::vector)
        `,
        doc.id,
        indice,
        texto,
        vectorLiteral,
      );
    }

    return doc;
  }

  /**
   * Búsqueda vectorial básica: top K chunks por empresa + query.
   */
  async search(
    empresaId: number,
    query: string,
    limit = 5,
  ): Promise<KnowledgeSearchResult[]> {
    const embedding = await this.fireworksIa.getEmbedding(query);
    const vectorLiteral = JSON.stringify(embedding);

    const rows = await this.prisma.$queryRawUnsafe<KnowledgeSearchResult[]>(
      `
      SELECT
        kc."id",
        kc."texto",
        kc."documentId",
        kc."indice",
        kd."titulo",
        kd."tipo"
      FROM "KnowledgeChunk" kc
      JOIN "KnowledgeDocument" kd ON kc."documentId" = kd."id"
      WHERE kd."empresaId" = $1
      ORDER BY kc."embedding" <-> $2::vector
      LIMIT $3
      `,
      empresaId,
      vectorLiteral,
      limit,
    );

    return rows;
  }

  /**
   * Parte un texto largo en chunks (~maxLen chars),
   * intentando respetar párrafos y oraciones.
   *
   * - Separa por párrafos (doble salto de línea).
   * - Si un párrafo es muy largo, lo corta por oraciones.
   * - Evita chunks vacíos.
   * - Intenta no dejar el último chunk demasiado pequeño.
   */
  private chunkText(text: string, maxLen = 800, minLen = 200): string[] {
    // Normalizar saltos de línea y espacios en blanco
    const clean = text.replace(/\r\n/g, '\n').trim();
    if (!clean) return [];

    const paragraphs = clean.split(/\n{2,}/); // separa por párrafos (2+ saltos)
    const chunks: string[] = [];
    let current = '';

    const pushCurrent = () => {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        chunks.push(trimmed);
      }
      current = '';
    };

    for (const raw of paragraphs) {
      const paragraph = raw.trim();
      if (!paragraph) continue;

      // Si el párrafo es MUY largo, lo partimos por oraciones
      if (paragraph.length > maxLen) {
        const sentences = paragraph.split(/(?<=[.!?¡¿])\s+/); // corta en ., ?, !

        for (const sentenceRaw of sentences) {
          const sentence = sentenceRaw.trim();
          if (!sentence) continue;

          let candidate = current ? `${current} ${sentence}` : sentence;

          // Si al agregar esta oración nos pasamos de maxLen...
          if (candidate.length > maxLen) {
            // Si lo que llevamos ya es razonable, lo empujamos
            if (current.trim().length >= minLen) {
              pushCurrent();
              current = sentence;
              candidate = current;
            } else if (!current) {
              // Oración individual demasiado larga: la partimos a lo bruto
              for (let i = 0; i < sentence.length; i += maxLen) {
                const part = sentence.slice(i, i + maxLen).trim();
                if (part) chunks.push(part);
              }
              current = '';
              continue;
            } else {
              // teníamos algo pequeño + oración larga: cerramos y empezamos nuevo
              pushCurrent();
              current = sentence;
              candidate = current;
            }
          }

          current = candidate;
        }

        // Cerramos chunk si quedó algo tras procesar el párrafo largo
        if (current.trim().length >= minLen) {
          pushCurrent();
        }

        continue;
      }

      // Párrafo "normal": intentamos unirlo al chunk actual
      const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
      if (candidate.length > maxLen) {
        // Si al unirlo nos pasamos, cerramos el chunk actual y empezamos uno nuevo
        if (current.trim().length > 0) {
          pushCurrent();
        }
        current = paragraph;
      } else {
        current = candidate;
      }
    }

    // Push final si quedó algo
    if (current.trim().length > 0) {
      pushCurrent();
    }

    // Si el último chunk quedó muy pequeñito, lo unimos con el anterior
    if (chunks.length > 1) {
      const last = chunks[chunks.length - 1];
      if (last.length < minLen) {
        chunks[chunks.length - 2] =
          `${chunks[chunks.length - 2]}\n\n${last}`.trim();
        chunks.pop();
      }
    }

    return chunks;
  }
}
