// src/whatsapp/domain/entities/whatsapp-message.entity.ts

import {
  WazDirection,
  WazStatus,
  WazMediaType,
  WhatsappMessage as WhatsappMessageRow,
} from '@prisma/client';
import { WhatsappMessageProps } from '../dto/create-chat.dto';

export class WhatsappMessage {
  private constructor(private props: WhatsappMessageProps) {}

  // ========= FACTORÍA DE DOMINIO (Crear nuevo mensaje) =========
  static create(params: {
    wamid: string;
    direction: WazDirection;
    from: string;
    to: string;
    type: WazMediaType;
    timestamp: bigint | number; // Aceptamos number para facilitar la entrada desde Unix timestamp

    chatSessionId?: number | null;
    clienteId?: number | null;
    body?: string | null;

    mediaUrl?: string | null;
    mediaMimeType?: string | null;
    mediaSha256?: string | null;

    status?: WazStatus;
    replyToWamid?: string | null;

    id?: number;
    creadoEn?: Date;
    actualizadoEn?: Date;
  }): WhatsappMessage {
    const {
      wamid,
      direction,
      from,
      to,
      type,
      timestamp,
      chatSessionId,
      clienteId,
      body,
      mediaUrl,
      mediaMimeType,
      mediaSha256,
      status,
      replyToWamid,
      id,
      creadoEn,
      actualizadoEn,
    } = params;

    if (!wamid) throw new Error('wamid es requerido para crear un mensaje');
    if (!from) throw new Error('El remitente (from) es requerido');
    if (!to) throw new Error('El destinatario (to) es requerido');

    const now = new Date();

    const props: WhatsappMessageProps = {
      id,
      wamid,
      direction,
      from,
      to,
      type,
      timestamp: typeof timestamp === 'number' ? BigInt(timestamp) : timestamp,

      chatSessionId: chatSessionId ?? null,
      clienteId: clienteId ?? null,

      body: body ?? null,

      mediaUrl: mediaUrl ?? null,
      mediaMimeType: mediaMimeType ?? null,
      mediaSha256: mediaSha256 ?? null,

      // Por defecto SENT si es OUTBOUND, o lo que venga si es INBOUND
      status: status ?? WazStatus.SENT,
      errorCode: null,
      errorMessage: null,

      replyToWamid: replyToWamid ?? null,

      creadoEn: creadoEn ?? now,
      actualizadoEn: actualizadoEn ?? now,
    };

    return new WhatsappMessage(props);
  }

  // ========= REHIDRATAR DESDE PRISMA =========
  static fromPrisma(row: WhatsappMessageRow): WhatsappMessage {
    return new WhatsappMessage({
      id: row.id,
      wamid: row.wamid,
      chatSessionId: row.chatSessionId,
      clienteId: row.clienteId,

      direction: row.direction,
      from: row.from,
      to: row.to,

      type: row.type,
      body: row.body,

      mediaUrl: row.mediaUrl,
      mediaMimeType: row.mediaMimeType,
      mediaSha256: row.mediaSha256,

      status: row.status,
      errorCode: row.errorCode,
      errorMessage: row.errorMessage,

      replyToWamid: row.replyToWamid,

      timestamp: row.timestamp,
      creadoEn: row.creadoEn,
      actualizadoEn: row.actualizadoEn,
    });
  }

  // ========= GETTERS =========

  get id() {
    return this.props.id;
  }
  get wamid() {
    return this.props.wamid;
  }
  get chatSessionId() {
    return this.props.chatSessionId;
  }
  get clienteId() {
    return this.props.clienteId;
  }

  get direction() {
    return this.props.direction;
  }
  get from() {
    return this.props.from;
  }
  get to() {
    return this.props.to;
  }

  get type() {
    return this.props.type;
  }
  get body() {
    return this.props.body;
  }

  get mediaUrl() {
    return this.props.mediaUrl;
  }
  get mediaMimeType() {
    return this.props.mediaMimeType;
  }

  get status() {
    return this.props.status;
  }
  get errorCode() {
    return this.props.errorCode;
  }
  get errorMessage() {
    return this.props.errorMessage;
  }

  get replyToWamid() {
    return this.props.replyToWamid;
  }

  get timestamp() {
    return this.props.timestamp;
  }

  // Helper útil: convierte el BigInt timestamp de Meta a Date nativo JS
  get timestampAsDate(): Date {
    // Meta envía timestamps en segundos, JS usa milisegundos.
    // Verificamos longitud por seguridad, pero usualmente se multiplica por 1000.
    return new Date(Number(this.props.timestamp) * 1000);
  }

  get creadoEn() {
    return this.props.creadoEn;
  }
  get actualizadoEn() {
    return this.props.actualizadoEn;
  }

  // ========= LÓGICA DE DOMINIO (Actualizaciones de Webhook) =========

  /**
   * Actualiza el estado a DELIVERED (doble check gris).
   * Útil cuando llega el webhook de 'status' -> 'delivered'
   */
  markAsDelivered() {
    // Si ya está leído o fallido, no retrocedemos el estado
    if (
      this.props.status === WazStatus.READ ||
      this.props.status === WazStatus.FAILED
    )
      return;
    if (this.props.status === WazStatus.DELIVERED) return;

    this.props.status = WazStatus.DELIVERED;
    this.touch();
  }

  /**
   * Actualiza el estado a READ (doble check azul).
   */
  markAsRead() {
    if (this.props.status === WazStatus.READ) return;

    this.props.status = WazStatus.READ;
    this.touch();
  }

  /**
   * Marca el mensaje como fallido y registra la razón.
   */
  markAsFailed(code: string, message: string) {
    this.props.status = WazStatus.FAILED;
    this.props.errorCode = code;
    this.props.errorMessage = message;
    this.touch();
  }

  /**
   * Asocia este mensaje a un cliente específico (ej. primera vez que escribe).
   */
  assignClient(clienteId: number) {
    if (this.props.clienteId === clienteId) return;
    this.props.clienteId = clienteId;
    this.touch();
  }

  /**
   * Vincula el mensaje a una sesión de Chat/IA.
   */
  assignSession(sessionId: number) {
    this.props.chatSessionId = sessionId;
    this.touch();
  }

  private touch() {
    this.props.actualizadoEn = new Date();
  }

  // ========= PARA PERSISTENCIA =========

  toObject(): WhatsappMessageProps {
    return { ...this.props };
  }

  /**
   * Serialización segura para JSON (BigInt suele romper JSON.stringify).
   * Convertimos el BigInt a string o number.
   */
  toJSON() {
    return {
      ...this.props,
      timestamp: this.props.timestamp.toString(), // BigInt -> String para evitar crash
    };
  }
}
