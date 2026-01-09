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
import { WhatsappApiMetaService } from 'src/whatsapp-api-meta/app/whatsapp-api-meta.service';
import { BroadCastMessageService } from './broadcast-message.service';
import * as dayjs from 'dayjs';
import 'dayjs/locale/es';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import * as isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import * as isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import * as customParseFormat from 'dayjs/plugin/customParseFormat';
import { TZGT } from 'src/Utils/TZGT';
import { OpenAiIaService } from 'src/fireworks-ia/app/open-ia-rag.service';
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.locale('es');

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
    private readonly whatsappApiMetaService: WhatsappApiMetaService, // SERVICION ADICIONAL PARA EVITAR ENROLLAMIENTO DE MODULOS

    private readonly broadcast: BroadCastMessageService, // SERVICION ADICIONAL PARA EVITAR ENROLLAMIENTO DE MODULOS

    private readonly openIA: OpenAiIaService, // SERVICION ADICIONAL PARA EVITAR ENROLLAMIENTO DE MODULOS
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

    if (params.direction !== WazDirection.INBOUND) {
      this.logger.warn('Mensaje no entrante ignorado por IA');
      return;
    }

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

    const isDesactivated = !cliente.botActivo;

    // PREPARAR TODO
    //  Sesión
    const session = await this.chatService.ensureOpenSession({
      empresaId: empresa.id,
      clienteId: cliente.id,
      telefono,
      canal,
    });

    //  Guardar mensaje del usuario (INBOUND)
    const userMessage = await this.chatService.addMessage({
      sessionId: session.id!,
      rol: ChatRole.USER,
      contenido: texto,
    });

    // STORAGE MEDIA & MESSAGE WHATSAPP
    let mediaUrl: string | null = null;
    let mediaMimeType: string | null = null;
    let mediaSha256: string | null = null;
    const mediaUrls: string[] = [];

    if (media?.mediaId) {
      try {
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
          empresaId: empresa.id,
          clienteId: cliente.id,
          sessionId: session.id!,
          wamid,
          tipo: media.kind,
          direction: params.direction, // INBOUND
          extension: ext,
          basePrefix: 'crm',
        });

        const uploaded = await this.cloudStorageDoSpaces.uploadBuffer({
          buffer,
          contentType: mediaMimeType,
          key,
          publicRead: true,
        });

        mediaUrl = uploaded.url ?? uploaded.url ?? null;
      } catch (error) {
        this.logger.error('Error subiendo imagen, continuando sin ella', error);
        mediaUrl = null;
      }
    }

    if (mediaUrl) {
      mediaUrls.push(mediaUrl);
    }

    let visionText = '';

    const textWithMedia = texto;
    //      visionText
    //       ? `${texto}

    // [DATOS EXTRAÍDOS AUTOMÁTICAMENTE DE IMÁGENES]
    // ${visionText}
    // [FIN DE DATOS EXTRAÍDOS]`
    //       : texto;

    // ENTRADA DEL CLIENTE
    const isboundMsg = await this.whatsappMessage.upsertByWamid({
      wamid,
      chatSessionId: session.id!,
      clienteId: cliente.id,

      direction: params.direction,
      from: telefono,
      to: params.to,

      type: params.type, // WazMediaType
      body: texto ?? null,

      mediaUrl,
      mediaMimeType: mediaMimeType,
      mediaSha256,

      status:
        params.direction === WazDirection.INBOUND
          ? WazStatus.DELIVERED
          : WazStatus.SENT,
      replyToWamid: params.replyToWamid ?? null,
      timestamp: params.timestamp,
    });

    await this.clienteService.updateUltimoMensaje(cliente.id);

    this.broadcast.notifyCrmUI('nuvia:new-message', {
      wamid: isboundMsg.id,
      status: isboundMsg.status,
    });

    // PREPARAR TODO

    if (isDesactivated) {
      this.logger.log(
        `Bot desactivado para ${telefono}. Mensaje guardado, pero sin respuesta automática.`,
      );
      return { status: 'saved_silent', userMessage };
    }

    // PREPARACION DE RESPONSE DEL MODELO

    //  Historial
    // const history = await this.chatService.getLastMessages(session.id!);
    // // SEPARAR Y DIFERENCIAR ENTRE MENSAJE DEL USUARIO Y BOT
    // const historyText = history
    //   .map((m) =>
    //     m.rol === ChatRole.USER
    //       ? `Usuario: ${m.contenido}`
    //       : `Bot: ${m.contenido}`,
    //   )
    //   .join('\n');

    const history = await this.chatService.getLastMessages(session.id!);

    // 2. CONVERTIR A FORMATO OPENAI (Array de objetos)
    // En lugar de hacer .join('\n'), mapeamos a objetos { role, content }
    const formattedHistory = history.map((m) => ({
      role:
        m.rol === ChatRole.USER ? ('user' as const) : ('assistant' as const),
      content: m.contenido ?? '', // Protección contra nulos
    }));

    //Buscar contexto en base de conocimiento
    // const knChunks = await this.knowledgeService.search(empresa.id, texto, 7);

    // let knChunks: any[] = [];
    // try {
    //   knChunks = await this.knowledgeService.search(empresa.id, texto, 7);
    // } catch (e) {
    //   this.logger.warn(
    //     'Fallo crítico en knowledgeService, continuando sin contexto.',
    //   );
    //   knChunks = [];
    // }

    // const contextText = knChunks;

    // const contextText = knChunks
    //   .map(
    //     (c, idx) =>
    //       `#${idx + 1} [distance=${c.distance?.toFixed(4) ?? 'N/A'}] (${c.tipo}) ${c.titulo}:\n${c.texto}`,
    //   )
    //   .join('\n\n---\n\n');

    // const imagenes = mediaUrl;

    //  Pedir respuesta al modelo usando RAG
    // const reply = await this.fireworksIa.replyWithContext({
    //   empresaNombre: empresa.nombre,
    //   context: contextText,
    //   historyText,
    //   question: textWithMedia,
    // });

    // let reply = '';

    // try {
    //   reply = await this.openIA.replyWithContext({
    //     empresaNombre: empresa.nombre,
    //     historyText,
    //     question: textWithMedia,
    //     imageUrls: mediaUrls,
    //   });
    // } catch (e) {
    //   this.logger.error('Error OpenAI', e);
    //   reply =
    //     'En este momento no puedo responder automáticamente. Un asesor te apoyará.';
    // }

    let reply = '';

    try {
      // 3. LLAMADA AL SERVICIO ACTUALIZADA
      reply = await this.openIA.replyWithContext({
        empresaNombre: empresa.nombre,
        history: formattedHistory, // <--- Enviamos el Array, ya no "historyText"
        question: textWithMedia,
        imageUrls: mediaUrls,
      });
    } catch (e) {
      this.logger.error('Error OpenAI', e);
      reply =
        'En este momento no puedo responder automáticamente. Un asesor te apoyará.';
    }

    // SALIDA DEL BOT | USUARIO

    const botMessage = await this.chatService.addMessage({
      sessionId: session.id!,
      rol: ChatRole.ASSISTANT,
      contenido: reply,
    });

    const { wamid: outWamid } = await this.whatsappApiMetaService.sendText(
      telefono,
      reply,
    );

    const outMsg = await this.whatsappMessage.upsertByWamid({
      wamid: outWamid ?? `local-${crypto.randomUUID()}`,
      chatSessionId: session.id!,
      clienteId: cliente.id,

      direction: WazDirection.OUTBOUND,
      from: params.to,
      to: telefono,

      type: WazMediaType.TEXT,
      body: reply,

      status: outWamid ? WazStatus.SENT : WazStatus.FAILED,
      replyToWamid: wamid,

      timestamp: BigInt(dayjs().tz(TZGT).unix()),

      mediaUrl: null,
      mediaMimeType: null,
      mediaSha256: null,
    });

    // NOTIFICAR UI (esto tampoco debe romper nada)
    this.broadcast.notifyCrmUI('nuvia:new-message', {
      wamid: outMsg.id,
      status: outMsg.status,
    });

    return { status: 'replied', userMessage, botMessage, reply };
  }

  /**
   * Procesa la actualización de estado (Sent, Delivered, Read, Failed)
   * que envía Meta Webhook.
   */
  async handleStatusUpdate(statusPayload: any) {
    const wamid = statusPayload.id;
    const rawStatus = statusPayload.status;

    // Log para depuración
    this.logger.debug(
      `Actualización de estado recibida para ${wamid}: ${rawStatus}`,
    );

    let newStatus: WazStatus | null = null;
    let errorCode: string | null = null;
    let errorMessage: string | null = null;

    // Mapear estado de string (Meta) a Enum
    switch (rawStatus) {
      case 'sent':
        newStatus = WazStatus.SENT;
        break;
      case 'delivered':
        newStatus = WazStatus.DELIVERED;
        break;
      case 'read':
        newStatus = WazStatus.READ;
        break;
      case 'failed':
        newStatus = WazStatus.FAILED;
        // Meta suele enviar errores dentro de un array 'errors'
        if (statusPayload.errors && statusPayload.errors.length > 0) {
          const err = statusPayload.errors[0];
          errorCode = String(err.code);
          errorMessage = err.title || err.message;
        }
        break;
      default:
        this.logger.warn(`Estado desconocido recibido de Meta: ${rawStatus}`);
        return; // No hacemos nada si no conocemos el estado
    }

    if (newStatus && wamid) {
      try {
        const dataUpdate = {
          wamid,
          newStatus,
          errorCode,
          errorMessage,
        };
        await this.whatsappMessage.upsertByWamidStatus(dataUpdate);
        //  cambió el estado
        this.broadcast.notifyCrmUI('nuvia:new-message', {
          wamid: wamid,
          status: newStatus,
        });
      } catch (error) {
        // Nota: A veces el evento 'sent' llega tan rápido que la DB aún está
        // guardando el mensaje original (Race Condition).
        this.logger.warn(
          `No se pudo actualizar estado ${newStatus} para ${wamid}.`,
          error,
        );
      }
    }
  }
}
