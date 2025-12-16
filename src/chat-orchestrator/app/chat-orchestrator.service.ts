import { Injectable, Logger } from '@nestjs/common';
import { EmpresaService } from 'src/empresa/app/empresa.service';
import { ClienteService } from 'src/cliente/app/cliente.service';
import { ChatService } from 'src/chat/app/chat.service';
import { FireworksIaService } from 'src/fireworks-ia/app/fireworks-ia.service';
import {
  ChatChannel,
  ChatRole,
  WazDirection,
  WazMediaType,
  WazStatus,
} from '@prisma/client';
import { KnowledgeService } from 'src/knowledge/app/knowledge.service';
import { extname } from 'path';
import { generarKeyWhatsapp } from 'src/Utils/enrutador-dospaces';
import { WhatsAppMessageService } from 'src/whatsapp/chat/app/whatsapp-chat.service';
import { MetaWhatsAppMediaService } from 'src/whatsapp/chat/app/meta-media.service';
import { CloudStorageService } from 'src/cloud-storage-dospaces/app/cloud-storage-dospaces.service';
import { extFromFilename, extFromMime } from 'src/Utils/extractors';

export interface IncomingMessageDto {
  empresaSlug: string;
  empresaNombreFallback: string;
  canal: ChatChannel;

  telefono: string;
  nombreClienteWhatsApp?: string | null;

  wamid: string;
  timestamp: bigint;
  replyToWamid?: string | null;

  direction: WazDirection;
  to: string;

  type: WazMediaType;
  texto: string;

  media?: MediaData | null;
}

export interface MediaData {
  mediaId: string; // message.image.id / message.document.id / ...
  kind: 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'other';
  mimeType?: string | null; // del webhook (puede venir) o lo completarás con meta.getMediaUrl()
  filename?: string | null; // solo documentos
  extension?: string | null; // inferida por ti
}

@Injectable()
export class ChatOrchestratorService {
  private readonly logger = new Logger(ChatOrchestratorService.name);
  constructor(
    private readonly empresaService: EmpresaService, // EMPRESA DATOS -> ORQUESTADOR
    private readonly clienteService: ClienteService, // CLIENTES -> ORQUESTADOR
    private readonly chatService: ChatService, // SESIONES CHAT BOT -> ORQUESTADOR
    private readonly knowledgeService: KnowledgeService, // CONOCIMIENTO RAG
    private readonly fireworksIa: FireworksIaService, // FIREWORKS-IA CEREBRO

    private readonly whatsappMessage: WhatsAppMessageService, // WHATSAPP MESSAGE SERVICE -> ORQUESTADOR DE MENSAJES
    private readonly metaWhatsappMedia: MetaWhatsAppMediaService, // DESCARGADOR DE MEDIA

    private readonly cloudStorageDoSpaces: CloudStorageService, // ALMACENAMIENTO BUCKET DO3
  ) {}

  /**
   * Punto central:
   * - Asegura empresa
   * - Asegura cliente por teléfono
   * - Asegura sesión abierta
   * - Guarda mensaje del usuario
   * - Busca contexto y responde
   */
  async handleIncomingMessage(params: IncomingMessageDto) {
    const {
      empresaSlug,
      empresaNombreFallback,
      telefono,
      texto,
      canal,
      nombreClienteWhatsApp,
      wamid,
      media,
    } = params;

    //  Empresa
    const empresa = await this.empresaService.ensureBySlug(
      empresaSlug,
      empresaNombreFallback,
    );

    //  Cliente
    let cliente = await this.clienteService.findByEmpresaAndTelefono(
      empresa.id,
      telefono,
    );

    if (!cliente) {
      const nombre =
        nombreClienteWhatsApp && nombreClienteWhatsApp.trim().length > 0
          ? nombreClienteWhatsApp.trim()
          : `Usuario ${telefono}`;

      cliente = await this.clienteService.create({
        empresaId: empresa.id,
        telefono,
        nombre,
      } as any);
    }

    //  Sesión
    const session = await this.chatService.ensureOpenSession({
      empresaId: empresa.id,
      clienteId: cliente.id,
      telefono,
      canal,
    });

    //  Guardar mensaje del usuario
    const userMessage = await this.chatService.addMessage({
      sessionId: session.id!,
      rol: ChatRole.USER,
      contenido: texto,
    });

    //  Historial
    const history = await this.chatService.getLastMessages(session.id!);

    const historyText = history
      .map((m) =>
        m.rol === ChatRole.USER
          ? `Usuario: ${m.contenido}`
          : `Bot: ${m.contenido}`,
      )
      .join('\n');

    //Buscar contexto en base de conocimiento
    const knChunks = await this.knowledgeService.search(empresa.id, texto, 7);

    const contextText = knChunks
      .map(
        (c, idx) =>
          `#${idx + 1} [distance=${c.distance?.toFixed(4) ?? 'N/A'}] (${c.tipo}) ${c.titulo}:\n${c.texto}`,
      )
      .join('\n\n---\n\n');

    // this.logger.debug(
    //   `[RAG] Contexto generado (${knChunks.length} chunks):\n` +
    //     contextText.slice(0, 2000), // evita logs enormes
    // );
    //  Pedir respuesta al modelo usando RAG
    const reply = await this.fireworksIa.replyWithContext({
      empresaNombre: empresa.nombre,
      context: contextText,
      historyText,
      question: texto,
    });

    // Guardar respuesta del bot
    const botMessage = await this.chatService.addMessage({
      sessionId: session.id!,
      rol: ChatRole.ASSISTANT,
      contenido: reply,
    });

    // STORAGE MEDIA & MESSAGE WHATSAPP

    let mediaUrl: string | null = null;
    let mediaMimeType: string | null = null;
    let mediaSha256: string | null = null;

    if (media?.mediaId) {
      const { buffer, meta } = await this.metaWhatsappMedia.fetchMedia(
        media.mediaId,
      );

      mediaMimeType =
        meta.mime_type ?? media.mimeType ?? 'application/octet-stream';
      mediaSha256 = meta.sha256 ?? null;

      const ext =
        media.extension ??
        extFromFilename(media.filename) ??
        extFromMime(mediaMimeType) ??
        'bin';

      const key = generarKeyWhatsapp({
        empresaId: empresa.id, // ❗ no hardcodees 1
        clienteId: cliente.id,
        sessionId: session.id!,
        wamid,
        tipo: media.kind, // ✅ aquí sí existe
        direction: params.direction, // INBOUND
        extension: ext,
        basePrefix: 'crm',
      });

      const uploaded = await this.cloudStorageDoSpaces.uploadBuffer({
        buffer,
        contentType: mediaMimeType, // ✅ NO uses media.kind
        key,
        publicRead: true,
      });

      mediaUrl = uploaded.url ?? uploaded.url ?? null;
    }

    const dataToUrl = {
      empresaId: 1,
      clienteId: cliente.id,
      sessionId: session.id,
      wamid: wamid,
      tipo: media.kind,
      direction: WazDirection.INBOUND,
      extension: media.extension,
      basePrefix: 'crm',
    };

    const urlDoSpaces = generarKeyWhatsapp(dataToUrl);
    const urlMediaFromMeta = await this.metaWhatsappMedia.getMediaUrl(
      media.mediaId,
    );
    const mediaDownloaded = await this.metaWhatsappMedia.downloadMediaBuffer(
      urlMediaFromMeta.url,
    );

    const bufferDto = {
      buffer: mediaDownloaded,
      contentType: media.kind,
      key: urlDoSpaces,
      publicRead: true,
    };

    await this.whatsappMessage.upsertByWamid({
      wamid,
      chatSessionId: session.id!,
      clienteId: cliente.id,

      direction: params.direction,
      from: telefono,
      to: params.to,

      type: params.type, // WazMediaType
      body: texto ?? null,

      mediaUrl,
      mediaMimeType: media.mimeType,
      mediaSha256,

      status: WazStatus.SENT,
      replyToWamid: params.replyToWamid ?? null,
      timestamp: params.timestamp,
    });
  }
}
