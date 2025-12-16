import { WazDirection, WazMediaType, WazStatus } from '@prisma/client';

export interface WhatsappMessageProps {
  id?: number;

  // Identificadores
  wamid: string;
  chatSessionId: number | null;
  clienteId: number | null;

  // Datos de envío
  direction: WazDirection;
  from: string;
  to: string;

  // Contenido
  type: WazMediaType;
  body: string | null;

  // Multimedia
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaSha256: string | null;

  // Estados
  status: WazStatus;
  errorCode: string | null;
  errorMessage: string | null;

  // Contexto
  replyToWamid: string | null;

  // Fechas
  timestamp: bigint; // Mantenemos BigInt por consistencia con Prisma
  creadoEn: Date;
  actualizadoEn: Date;
}
