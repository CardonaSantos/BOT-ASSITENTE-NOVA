import { Prisma } from '@prisma/client';

export const selectedWhatsappMessage = {
  id: true,
  creadoEn: true,
  actualizadoEn: true,
  body: true,
  chatSessionId: true,
  direction: true,
  errorCode: true,
  errorMessage: true,
  from: true,
  mediaMimeType: true,
  mediaSha256: true,
  mediaUrl: true,
  replyToWamid: true,
  timestamp: true,
  status: true,
  type: true,
  to: true,
  wamid: true,
  cliente: {
    select: {
      id: true,
      nombre: true,
      creadoEn: true,
      actualizadoEn: true,
      telefono: true,
      uuid: true,
    },
  },
};

export type selecteWhatsappMessage = Prisma.WhatsappMessageGetPayload<{
  select: typeof selectedWhatsappMessage;
}>;

export type selectedWhatsappMessages = selecteWhatsappMessage[];
