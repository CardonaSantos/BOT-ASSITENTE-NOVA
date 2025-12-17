import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  WHATSAPP_MESSAGE,
  WhatsappMessageRepository,
} from '../domain/whatsapp-chat.repository';
import { WhatsappMessageProps } from '../dto/create-chat.dto';
import { selectedWhatsappMessage } from '../selects/select-chats';
import { FindWhatsappMessagesQueryDto } from '../dto/find-whatsapp-messages.query';
import { WhatsappMessage } from '../entities/chat.entity';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';
import { Prisma, WazDirection, WazMediaType, WazStatus } from '@prisma/client';
import { SearchWhatsappMessageDto } from '../dto/query';

@Injectable()
export class WhatsAppMessageService {
  constructor(
    @Inject(WHATSAPP_MESSAGE)
    private readonly repo: WhatsappMessageRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: WhatsappMessageProps) {
    const msg = WhatsappMessage.create({
      wamid: dto.wamid,
      direction: dto.direction,
      from: dto.from,
      to: dto.to,
      type: dto.type,
      timestamp: BigInt(dto.timestamp),

      chatSessionId: dto.chatSessionId ?? null,
      clienteId: dto.clienteId ?? null,
      body: dto.body ?? null,

      mediaUrl: dto.mediaUrl ?? null,
      mediaMimeType: dto.mediaMimeType ?? null,
      mediaSha256: dto.mediaSha256 ?? null,

      status: dto.status, // si no viene, tu entidad pone SENT
      replyToWamid: dto.replyToWamid ?? null,
    });

    const saved = await this.repo.create(msg);

    // si quieres devolver enriquecido (cliente) al crear:
    const row = await this.prisma.whatsappMessage.findUnique({
      where: { wamid: saved.wamid },
      select: selectedWhatsappMessage,
    });

    return row ? this.toEnrichedResponse(row) : saved.toJSON();
  }

  async findAll(q: FindWhatsappMessagesQueryDto) {
    const { take = 50, skip = 0 } = q; // defaults

    const where: Prisma.WhatsappMessageWhereInput = {};

    if (q.telefono) {
      where.OR = [
        { from: { contains: q.telefono } },
        { to: { contains: q.telefono } },
      ];
    }
    if (q.clienteId) where.clienteId = q.clienteId;
    if (q.chatSessionId) where.chatSessionId = q.chatSessionId;
    if (q.direction) where.direction = q.direction;
    if (q.status) where.status = q.status;
    if (q.type) where.type = q.type;

    // Ejecutamos dos consultas en paralelo (Transacción)
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.whatsappMessage.count({ where }), // 1. Contar totales con los filtros
      this.prisma.whatsappMessage.findMany({
        // 2. Traer la página actual
        where,
        select: selectedWhatsappMessage,
        orderBy: { timestamp: 'desc' },
        take: take,
        skip: skip,
      }),
    ]);

    // Retornamos estructura estandarizada
    return {
      data: rows.map((r) => this.toEnrichedResponse(r)),
      meta: {
        total,
        take,
        skip,
        page: Math.floor(skip / take) + 1,
        totalPages: Math.ceil(total / take),
        hasNextPage: skip + take < total,
        hasPreviousPage: skip > 0,
      },
    };
  }

  async findOne(id: number) {
    const row = await this.prisma.whatsappMessage.findUnique({
      where: { id },
      select: selectedWhatsappMessage,
    });

    if (!row) throw new NotFoundException(`WhatsappMessage ${id} no existe`);
    return this.toEnrichedResponse(row);
  }

  async remove(id: number) {
    await this.prisma.whatsappMessage.delete({ where: { id } });
    return { ok: true };
  }

  /** Convierte row (con cliente) a un response JSON safe (BigInt -> string) */
  private toEnrichedResponse(row: any) {
    const domain = WhatsappMessage.fromPrisma(row);
    const json = domain.toJSON();

    return {
      ...json,
      cliente: row.cliente ?? null, // mantener el select enriquecido
    };
  }

  //MANEJO ESPECIAL
  async upsertByWamid(dto: {
    wamid: string;
    chatSessionId: number | null;
    clienteId: number | null;
    direction: WazDirection;
    from: string;
    to: string;
    type: WazMediaType;
    body: string | null;
    mediaUrl: string | null;
    mediaMimeType: string | null;
    mediaSha256: string | null;
    status: WazStatus;
    replyToWamid: string | null;
    timestamp: bigint;
  }) {
    const row = await this.prisma.whatsappMessage.upsert({
      where: { wamid: dto.wamid },
      create: dto,
      update: {
        // por si el 1er evento llegó sin mediaUrl y luego lo completas
        chatSessionId: dto.chatSessionId,
        clienteId: dto.clienteId,
        body: dto.body,
        mediaUrl: dto.mediaUrl,
        mediaMimeType: dto.mediaMimeType,
        mediaSha256: dto.mediaSha256,
        status: dto.status,
        replyToWamid: dto.replyToWamid,
        timestamp: dto.timestamp,
      },
    });
    return row;
  }

  //MANEJO ESPECIAL
  async upsertByWamidStatus(dto: {
    wamid: string;
    newStatus: WazStatus;
    errorCode: string | null;
    errorMessage: string | null;
  }) {
    return this.repo.upsertByWamidStatus(dto);
  }

  // GET DE CLIENTE CON SU HISTORIAL
  async getClienteWithHistorial(id: number, q: SearchWhatsappMessageDto) {
    return await this.repo.findClienteWithChat(id, q);
  }
}
