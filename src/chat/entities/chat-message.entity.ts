// src/chat/entities/chat-message.entity.ts
import { ChatRole } from '@prisma/client';

export class ChatMessage {
  constructor(
    public readonly id: number | null,
    public readonly sessionId: number,
    public rol: ChatRole,
    public contenido: string,
    public tokens: number | null,
    public readonly creadoEn?: Date,
    public readonly actualizadoEn?: Date,
  ) {}

  static create(props: {
    sessionId: number;
    rol: ChatRole;
    contenido: string;
    tokens?: number | null;
  }): ChatMessage {
    return new ChatMessage(
      null,
      props.sessionId,
      props.rol,
      props.contenido,
      props.tokens ?? null,
    );
  }
}
