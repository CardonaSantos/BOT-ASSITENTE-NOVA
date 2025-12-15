import * as dayjs from 'dayjs';
import 'dayjs/locale/es';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import * as isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import * as isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import * as customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.locale('es');

type WaMediaType =
  | 'image'
  | 'document'
  | 'audio'
  | 'video'
  | 'sticker'
  | 'other';
type WaDirection = 'in' | 'out';

function sanitizeExt(ext: string) {
  const clean = ext.replace('.', '').toLowerCase();
  return clean ? `.${clean}` : '';
}

export function generarKeyWhatsapp(params: {
  empresaId: number;
  clienteId: number;
  sessionId: number;
  wamid: string; // message.id de WhatsApp
  tipo: WaMediaType;
  direction: WaDirection;
  extension: string; // "pdf" | "jpg" | etc (sin punto o con punto)
  basePrefix?: string; // default: "crm"
  timestampUnixSeconds?: number; // si quieres usar el timestamp del mensaje
}) {
  const base = params.basePrefix ?? 'crm';

  const dt = params.timestampUnixSeconds
    ? dayjs.unix(params.timestampUnixSeconds)
    : dayjs();

  const y = dt.format('YYYY');
  const m = dt.format('MM');
  const d = dt.format('DD');

  const ext = sanitizeExt(params.extension);

  return `${base}/whatsapp/empresas/${params.empresaId}/clientes/${params.clienteId}/sesiones/${params.sessionId}/${y}/${m}/${d}/${params.direction}/${params.tipo}/${params.wamid}${ext}`;
}
