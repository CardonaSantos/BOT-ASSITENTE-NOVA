import { Injectable, Logger } from '@nestjs/common';
import { WhatsappMessageRepository } from '../domain/whatsapp-chat.repository';
import { WhatsappMessage } from '../entities/chat.entity';
import { throwFatalError } from 'src/Utils/CommonFatalError';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';
import { selectedWhatsappMessage } from '../selects/select-chats';

@Injectable()
export class PrismaWhatsappMessage implements WhatsappMessageRepository {
  private readonly logger = new Logger(PrismaWhatsappMessage.name);

  constructor(private readonly prisma: PrismaService) {}

  private toDomain(row: any): WhatsappMessage {
    const message = WhatsappMessage.fromPrisma(row);

    if (row.cliente) {
      message.assignClient(row.client.id);
    }

    return message;
    // return WhatsappMessage.fromPrisma(row);
  }

  async create(whatsappMessage: WhatsappMessage): Promise<WhatsappMessage> {
    try {
      const record = await this.prisma.whatsappMessage.create({
        data: whatsappMessage,
      });

      return this.toDomain(record);
    } catch (error) {
      throwFatalError(error, this.logger, 'PrismaWhatsappMessage -create');
    }
  }

  async findAll(): Promise<WhatsappMessage[]> {
    try {
      const records = await this.prisma.whatsappMessage.findMany({
        select: selectedWhatsappMessage,
      });
      const formatted =
        Array.isArray(records) &&
        records.length &&
        records.map((r) => this.toDomain(r));
      return formatted;
    } catch (error) {
      throwFatalError(error, this.logger, 'PrismaWhatsappMessage -findAll');
    }
  }

  async findById(id: number): Promise<WhatsappMessage | null> {
    try {
      const record = await this.prisma.whatsappMessage.findUnique({
        where: {
          id: id,
        },
      });

      return this.toDomain(record);
    } catch (error) {
      throwFatalError(error, this.logger, 'PrismaWhatsappMessage -findById');
    }
  }

  async findByTelefono(telefono: string): Promise<WhatsappMessage | null> {
    try {
      const record = await this.prisma.whatsappMessage.findFirst({
        where: {
          from: telefono,
        },
      });

      return this.toDomain(record);
    } catch (error) {
      throwFatalError(error, this.logger, 'PrismaWhatsappMessage -findById');
    }
  }

  async update(
    id: number,
    data: Partial<WhatsappMessage>,
  ): Promise<WhatsappMessage> {
    try {
      const recortToUpdate = await this.prisma.whatsappMessage.update({
        where: {
          id: id,
        },
        data: data,
      });

      return this.toDomain(recortToUpdate);
    } catch (error) {
      throwFatalError(error, this.logger, 'PrismaWhatsappMessage -update');
    }
  }
}
