import { Logger } from '@nestjs/common';

const MAX_LOG_CHARS = 25_000;

export function safePretty(obj: any, maxChars = MAX_LOG_CHARS) {
  // 🛡️ Guardias de seguridad: si es null o undefined, retorna texto plano
  if (obj === undefined) return 'undefined';
  if (obj === null) return 'null';
  if (typeof obj === 'string') return obj;

  let s = '';

  try {
    const json = JSON.stringify(obj, null, 2);
    // Si JSON.stringify retorna undefined (ej. funciones), lo forzamos a string
    s = json || String(obj);
  } catch (e: any) {
    return `[unstringifiable] ${e?.message ?? e}`;
  }

  if (s.length <= maxChars) return s;
  return (
    s.slice(0, maxChars) + `\n... (TRUNCATED ${s.length - maxChars} chars)`
  );
}

function pickHeaders(headers: any) {
  // Solo lo útil para debug
  const keys = [
    'user-agent',
    'content-type',
    'x-hub-signature-256',
    'x-forwarded-for',
    'x-real-ip',
    'x-request-id',
  ];
  const out: Record<string, any> = {};
  for (const k of keys) out[k] = headers?.[k];
  return out;
}

export function logWhatsAppWebhook(logger: Logger, req: any, body: any) {
  // 🔧 Toggle: prende/apaga logs pesados con env
  const debugRaw = process.env.WA_WEBHOOK_DEBUG_RAW === '1';
  const debugParsed = process.env.WA_WEBHOOK_DEBUG_PARSED !== '0'; // default ON

  logger.log(`📩 WA webhook recibido`);

  if (debugRaw) {
    logger.debug(`🧾 Headers:\n${safePretty(pickHeaders(req.headers), 4000)}`);
    logger.debug(`🧾 Body completo:\n${safePretty(body)}`);
  }

  if (!debugParsed) return;

  const entries = Array.isArray(body?.entry) ? body.entry : [];
  logger.debug(
    `📦 Estructura: object=${body?.object} entryCount=${entries.length}`,
  );

  for (const [ei, entry] of entries.entries()) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    logger.debug(`➡️ entry[${ei}] changes=${changes.length}`);

    for (const [ci, change] of changes.entries()) {
      const value = change?.value;
      const messages = Array.isArray(value?.messages) ? value.messages : [];
      const statuses = Array.isArray(value?.statuses) ? value.statuses : [];
      const contacts = Array.isArray(value?.contacts) ? value.contacts : [];

      logger.debug(
        `  🔁 change[${ci}] messages=${messages.length} statuses=${statuses.length} contacts=${contacts.length}`,
      );

      // Contacts: nombre, wa_id
      if (contacts.length) {
        const c0 = contacts[0];
        logger.debug(
          `  👤 contact: wa_id=${c0?.wa_id} name=${c0?.profile?.name}`,
        );
      }

      // Status updates (sent/delivered/read/failed)
      for (const st of statuses) {
        // Preparamos el string de error solo si existe
        const errorStr = st.errors
          ? ` errors=${safePretty(st.errors, 500)}`
          : '';

        logger.debug(
          `  ✅ status: id=${st?.id} recipient=${st?.recipient_id} status=${st?.status} ts=${st?.timestamp}${errorStr}`,
        );
      }

      // Incoming messages (text/image/document/etc)
      for (const msg of messages) {
        const base = `  📨 msg: id=${msg?.id} from=${msg?.from} type=${msg?.type} ts=${msg?.timestamp}`;

        switch (msg?.type) {
          case 'text':
            logger.debug(`${base} text="${msg?.text?.body ?? ''}"`);
            break;

          case 'image':
            logger.debug(
              `${base} image.id=${msg?.image?.id} mime=${msg?.image?.mime_type} caption="${msg?.image?.caption ?? ''}" sha256=${msg?.image?.sha256}`,
            );
            break;

          case 'document':
            logger.debug(
              `${base} doc.id=${msg?.document?.id} mime=${msg?.document?.mime_type} filename="${msg?.document?.filename ?? ''}" caption="${msg?.document?.caption ?? ''}" sha256=${msg?.document?.sha256}`,
            );
            break;

          case 'audio':
            logger.debug(
              `${base} audio.id=${msg?.audio?.id} mime=${msg?.audio?.mime_type} sha256=${msg?.audio?.sha256}`,
            );
            break;

          case 'video':
            logger.debug(
              `${base} video.id=${msg?.video?.id} mime=${msg?.video?.mime_type} caption="${msg?.video?.caption ?? ''}" sha256=${msg?.video?.sha256}`,
            );
            break;

          case 'location':
            logger.debug(
              `${base} location lat=${msg?.location?.latitude} lng=${msg?.location?.longitude} name="${msg?.location?.name ?? ''}" addr="${msg?.location?.address ?? ''}"`,
            );
            break;

          case 'button':
            logger.debug(
              `${base} button text="${msg?.button?.text ?? ''}" payload="${msg?.button?.payload ?? ''}"`,
            );
            break;

          case 'interactive':
            logger.debug(
              `${base} interactive:\n${safePretty(msg?.interactive, 8000)}`,
            );
            break;

          default:
            // cualquier tipo nuevo/inesperado
            logger.debug(`${base} raw:\n${safePretty(msg, 8000)}`);
            break;
        }

        // Context (reply to message)
        if (msg?.context?.id) {
          logger.debug(
            `  ↩️ context: replied_to_msg_id=${msg.context.id} from=${msg?.context?.from}`,
          );
        }
      }
    }
  }
}
