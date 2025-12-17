import { Cliente } from 'src/cliente/entities/cliente.entity';
import { WhatsappMessage } from '../entities/chat.entity';
import { FindClientesMessagesQuery } from 'src/cliente/dto/dto-pagination';
import { SearchWhatsappMessageDto } from '../dto/query';

export interface ChatClient {
  chats: WhatsappMessage[];
  cliente: Cliente;
}

export const WHATSAPP_MESSAGE = Symbol('WHATSAPP_MESSAGE');

export interface WhatsappMessageRepository {
  create(whatsappMessage: WhatsappMessage): Promise<WhatsappMessage>;
  update(id: number, data: Partial<WhatsappMessage>): Promise<WhatsappMessage>;
  findById(id: number): Promise<WhatsappMessage | null>;
  findByTelefono(telefono: string): Promise<WhatsappMessage | null>;
  findAll(): Promise<WhatsappMessage[]>;

  findClienteWithChat(
    id: number,
    q: SearchWhatsappMessageDto,
  ): Promise<{
    data: ChatClient;
    meta: {
      total: number;
      take: number;
      skip: number;
      page: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }>;
}
