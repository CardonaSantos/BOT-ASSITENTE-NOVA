import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  WazDirection,
  WazMediaType,
  WazStatus,
  ChatRole,
} from '@prisma/client';
import * as crypto from 'crypto';
import { ChatService } from 'src/chat/app/chat.service';
import { ClienteService } from 'src/cliente/app/cliente.service';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';
import { WhatsappApiMetaService } from 'src/whatsapp-api-meta/app/whatsapp-api-meta.service';
import { WhatsAppMessageService } from 'src/whatsapp/chat/app/whatsapp-chat.service';
import { BroadCastMessageService } from './broadcast-message.service';
import { CloudStorageService } from 'src/cloud-storage-dospaces/app/cloud-storage-dospaces.service';
import { extFromFilename, extFromMime } from 'src/Utils/extractors';
import { WaMediaType } from 'src/Utils/mediaData.interface';
import { generarKeyWhatsapp } from 'src/Utils/enrutador-dospaces';

@Injectable()
export class SendHumanTextService {
  private readonly logger = new Logger(SendHumanTextService.name);

  constructor(
    private readonly whatsappApi: WhatsappApiMetaService,
    private readonly whatsappMessage: WhatsAppMessageService,
    private readonly clienteService: ClienteService,
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
    private readonly broadcast: BroadCastMessageService,
    private readonly cloudStorage: CloudStorageService,
  ) {}

  async sendHumanResponse(
    clienteId: number,
    text: string,
    file?: Express.Multer.File,
  ) {
    const cliente = await this.clienteService.findById(clienteId);
    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    // 2. GESTIONAR SESIÓN (CORRECCIÓN AQUÍ)
    let session = await this.chatService.findLastSession(cliente.id);

    // SI NO HAY SESIÓN, LA CREAMOS
    if (!session) {
      this.logger.log(
        `No hay sesión previa para cliente ${clienteId}, creando una nueva...`,
      );
      // Asegúrate de tener un método createSession o similar en tu ChatService
      session = await this.chatService.createSession({
        clienteId: cliente.id,
        empresaId: 1,
        canal: 'WHATSAPP',
        telefono: cliente.telefono,
      });
    }

    const sessionId = session.id; // Ahora SIEMPRE tendrás un ID válido real
    // Apagar bot si es necesario
    if (cliente.botActivo) {
      await this.prisma.cliente.update({
        where: { id: cliente.id },
        data: { botActivo: false },
      });
    }

    // Variables para el flujo
    let outWamid: string | null = null; // ID de Meta
    let localWamid = `out-${crypto.randomUUID()}`; // ID Local para la ruta del archivo
    let mediaUrl: string | null = null;
    let mediaType: WazMediaType = WazMediaType.TEXT;
    let mediaMimeType: string | null = null;

    // 2. PROCESAR ARCHIVO (Si existe)
    if (file) {
      mediaMimeType = file.mimetype;

      // A. Determinar extensión y tipo
      const ext =
        extFromMime(file.mimetype) ??
        extFromFilename(file.originalname) ??
        'bin';
      const { waKind, prismaKind, metaType } = this.detectMediaType(
        file.mimetype,
      );
      mediaType = prismaKind;

      // B. Generar la Key (Ruta) usando TU enrutador
      const key = generarKeyWhatsapp({
        empresaId: cliente.empresaId,
        clienteId: cliente.id,
        sessionId: sessionId,
        wamid: localWamid, // Usamos el ID local porque aún no tenemos el de Meta
        tipo: waKind, // 'image', 'document', etc.
        direction: WazDirection.OUTBOUND,
        extension: ext,
        basePrefix: 'crm', // Opcional, ya tiene default
      });

      // C. Subir a DigitalOcean
      const upload = await this.cloudStorage.uploadBuffer({
        buffer: file.buffer,
        contentType: file.mimetype,
        key: key,
        publicRead: true,
      });
      mediaUrl = upload.url;

      // D. Enviar a Meta
      const sent = await this.whatsappApi.sendMedia(
        cliente.telefono,
        metaType,
        mediaUrl,
        text, // El texto se usa como caption
        file.originalname, // Nombre para documentos
      );
      outWamid = sent?.messages?.[0]?.id;
    } else {
      // 3. ENVIAR SOLO TEXTO
      const sent = await this.whatsappApi.sendHumanText(cliente.telefono, text);
      outWamid = sent?.messages?.[0]?.id;
    }

    // 4. GUARDAR EN DB (Upsert)
    // Nota: Usamos outWamid si Meta respondió, sino el localWamid
    const finalWamid = outWamid ?? localWamid;

    const savedMsg = await this.whatsappMessage.upsertByWamid({
      wamid: finalWamid,
      chatSessionId: sessionId,
      clienteId: cliente.id,
      direction: WazDirection.OUTBOUND,
      from: process.env.WHATSAPP_DISPLAY_NUMBER || 'BOT',
      to: cliente.telefono,

      type: mediaType,
      body: text, // Caption o Texto

      mediaUrl: mediaUrl,
      mediaMimeType: mediaMimeType,
      mediaSha256: null, // Podrías calcularlo con crypto si quieres
      replyToWamid: null,

      status: WazStatus.SENT,
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
    });

    // 5. GUARDAR EN HISTORIAL DEL CHAT (Para RAG/Contexto)
    await this.chatService.addMessage({
      sessionId: sessionId,
      rol: ChatRole.ASSISTANT, // Actuamos como asistente humano
      contenido: mediaUrl ? `[Archivo Adjunto] ${text}` : text,
    });

    this.logger.log(`Mensaje humano enviado a ${cliente.telefono}`);

    // 6. BROADCAST A LA UI
    this.broadcast.notifyCrmUI('nuvia:new-message', {
      wamid: savedMsg.id,
      status: savedMsg.status,
    });

    return { ok: true, messageId: savedMsg.id };
  }

  /**
   * Helper privado para mapear el MimeType a los 3 tipos que necesitamos:
   * 1. WaMediaType (Tu util de enrutador)
   * 2. WazMediaType (Prisma DB)
   * 3. Meta Type (API de Whatsapp)
   */
  private detectMediaType(mime: string) {
    if (mime.startsWith('image/')) {
      return {
        waKind: 'image' as WaMediaType,
        prismaKind: WazMediaType.IMAGE,
        metaType: 'image' as const,
      };
    }
    if (mime.startsWith('audio/')) {
      return {
        waKind: 'audio' as WaMediaType,
        prismaKind: WazMediaType.AUDIO,
        metaType: 'audio' as const,
      };
    }
    if (mime.startsWith('video/')) {
      return {
        waKind: 'video' as WaMediaType,
        prismaKind: WazMediaType.VIDEO,
        metaType: 'video' as const,
      };
    }
    // Default a documento
    return {
      waKind: 'document' as WaMediaType,
      prismaKind: WazMediaType.DOCUMENT,
      metaType: 'document' as const,
    };
  }
}
