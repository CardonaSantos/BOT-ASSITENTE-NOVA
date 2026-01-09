// src/chat/domain/chat-message.repository.ts
import { ChatMessage } from '../entities/chat-message.entity';

export const CHAT_MESSAGE_REPOSITORY = Symbol('CHAT_MESSAGE_REPOSITORY');

export interface ChatMessageRepository {
  create(message: ChatMessage): Promise<ChatMessage>;
  findBySession(sessionId: number): Promise<ChatMessage[]>;
  findLastBySession(sessionId: number): Promise<ChatMessage[]>;

  markChatAsRead(clienteId: number): void;

  removeAllMessages(clienteId: number): Promise<void>;

  addMediaUrlToMessage(
    messageId: number,
    mediaUrl: string,
  ): Promise<ChatMessage>;
}
