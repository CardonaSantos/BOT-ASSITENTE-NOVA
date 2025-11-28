import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';
import { ChatMessageRepository } from '../domain/chat-message.repository';
import { ChatMessage } from '../entities/chat-message.entity';
import { ChatRole } from '@prisma/client';
import { throwFatalError } from 'src/Utils/CommonFatalError';

@Injectable()
export class PrismaChatMessageRepository implements ChatMessageRepository {
  private readonly logger = new Logger(PrismaChatMessageRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  private toDomain(row: any): ChatMessage | null {
    if (!row) return null;

    return new ChatMessage(
      row.id,
      row.sessionId,
      row.rol,
      row.contenido,
      row.tokens,
      row.creadoEn,
      row.actualizadoEn,
    );
  }

  async create(m: ChatMessage): Promise<ChatMessage> {
    try {
      const row = await this.prisma.chatMessage.create({
        data: {
          sessionId: m.sessionId,
          rol: m.rol as ChatRole,
          contenido: m.contenido,
          tokens: m.tokens,
        },
      });

      return this.toDomain(row)!;
    } catch (error) {
      throwFatalError(
        error,
        this.logger,
        'Chat - PrismaChatMessageRepository.create',
      );
    }
  }

  async findBySession(sessionId: number): Promise<ChatMessage[]> {
    try {
      const rows = await this.prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { creadoEn: 'asc' },
      });

      return rows.map((r) => this.toDomain(r)!);
    } catch (error) {
      throwFatalError(
        error,
        this.logger,
        'Chat - PrismaChatMessageRepository.findBySession',
      );
    }
  }

  async findLastBySession(
    sessionId: number,
    limit: number,
  ): Promise<ChatMessage[]> {
    try {
      const rows = await this.prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { creadoEn: 'desc' },
        take: limit,
      });

      // devolvemos en orden cronológico ascendente
      return rows.reverse().map((r) => this.toDomain(r)!);
    } catch (error) {
      throwFatalError(
        error,
        this.logger,
        'Chat - PrismaChatMessageRepository.findLastBySession',
      );
    }
  }
}
