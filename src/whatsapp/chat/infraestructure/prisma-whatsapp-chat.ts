import { Injectable, Logger } from '@nestjs/common';
import {
  ChatClient,
  WhatsappMessageRepository,
} from '../domain/whatsapp-chat.repository';
import { WhatsappMessage } from '../entities/chat.entity';
import { throwFatalError } from 'src/Utils/CommonFatalError';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';
import { selectedWhatsappMessage } from '../selects/select-chats';
import { SearchWhatsappMessageDto } from '../dto/query';
import { Prisma, WazStatus } from '@prisma/client';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { selectedCliente } from 'src/cliente/selects/select-cliente';

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

  // CONSEGUIR UN SOLO CLIENTE CON SUS CHATS
  async findClienteWithChat(
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
  }> {
    try {
      const {
        page = 1,
        limit = 50,
        search,
        startDate,
        endDate,
        ...filters
      } = q;
      const take = Number(limit);
      const skip = (Number(page) - 1) * take;

      const whereMessages: Prisma.WhatsappMessageWhereInput = {
        clienteId: id,

        ...filters,
        ...(search
          ? {
              OR: [
                { body: { contains: search, mode: 'insensitive' } },
                { wamid: { equals: search } },
              ],
            }
          : {}),

        ...(startDate || endDate
          ? {
              creadoEn: {
                gte: startDate,
                lte: endDate,
              },
            }
          : {}),
      };

      const [cliente, totalMessages, messages] = await this.prisma.$transaction(
        [
          this.prisma.cliente.findUniqueOrThrow({
            where: { id },
            select: selectedCliente,
          }),

          this.prisma.whatsappMessage.count({
            where: whereMessages,
          }),

          this.prisma.whatsappMessage.findMany({
            where: whereMessages,
            take: take,
            skip: skip,
            orderBy: { creadoEn: 'asc' },
            select: selectedWhatsappMessage,
          }),
        ],
      );

      return {
        data: {
          cliente: Cliente.fromPrisma(cliente),
          chats: messages.map((msg) => WhatsappMessage.fromPrisma(msg)),
        },

        meta: {
          total: totalMessages,
          take: take,
          skip: skip,
          page: Number(page),
          totalPages: Math.ceil(totalMessages / take),
          hasNextPage: skip + take < totalMessages,
          hasPreviousPage: skip > 0,
        },
      };
    } catch (error) {
      throwFatalError(error, this.logger, 'findClienteWithChat');
    }
  }

  // ACTUALIZAR ESTADO DE MENSAJE POR WAMID
  async upsertByWamidStatus(data: {
    wamid: string;
    newStatus: WazStatus;
    errorCode: string | null;
    errorMessage: string | null;
  }): Promise<WhatsappMessage> {
    try {
      const row = await this.prisma.whatsappMessage.update({
        where: {
          wamid: data.wamid,
        },
        data: {
          status: data.newStatus,
          errorCode: data.errorCode,
          errorMessage: data.errorMessage,
          actualizadoEn: new Date(),
        },
      });
      return this.toDomain(row);
    } catch (error) {
      // Si el mensaje no existe (Race condition), esto lanzará error.
      throwFatalError(error, this.logger, 'upsertByWamidStatus');
    }
  }
}
