import { WazDirection, WazMediaType, WazStatus } from '@prisma/client';

export interface MediaDataArray {
  type: WazMediaType;
  id: number;
  status: WazStatus;
  creadoEn: Date;
  actualizadoEn: Date;
  wamid: string;
  direction: WazDirection;
  from: string;
  to: string;
  body: string;
  mediaUrl: string;
  cliente: {
    id: number;
    nombre: string;
    telefono: string;
  };
}

export interface MediaArrayResponse {
  id: number;
  body: string;
  direction: WazDirection;
  creadoEn: Date;
  actualizadoEn: Date;
  from: string;
  to: string;
  status: WazStatus;
  type: WazMediaType;
  wamid: string;
  mediaUrl: string;
  cliente: {
    id: number;
    nombre: string;
    telefono: string;
  };
}

export function mapMediaArray(
  data?: MediaDataArray[] | null,
): Array<MediaArrayResponse> {
  if (!Array.isArray(data)) return [];

  return data.map((record) => ({
    id: record.id,
    body: record.body,
    direction: record.direction,
    creadoEn: record.creadoEn,
    actualizadoEn: record.actualizadoEn,
    from: record.from,
    to: record.to,
    status: record.status,
    type: record.type,
    wamid: record.wamid,
    mediaUrl: record.mediaUrl,
    cliente: record.cliente
      ? {
          id: record.cliente.id,
          nombre: record.cliente.nombre,
          telefono: record.cliente.telefono,
        }
      : null,
  }));
}
