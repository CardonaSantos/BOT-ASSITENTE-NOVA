import { WhatsappMessage } from '../entities/chat.entity';

export const WHATSAPP_MESSAGE = Symbol('WHATSAPP_MESSAGE');

export interface WhatsappMessageRepository {
  create(whatsappMessage: WhatsappMessage): Promise<WhatsappMessage>;
  update(id: number, data: Partial<WhatsappMessage>): Promise<WhatsappMessage>;
  findById(id: number): Promise<WhatsappMessage | null>;
  findByTelefono(telefono: string): Promise<WhatsappMessage | null>;
  findAll(): Promise<WhatsappMessage[]>;
}
