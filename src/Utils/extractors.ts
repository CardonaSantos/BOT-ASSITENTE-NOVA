import { WazMediaType } from '@prisma/client';

export function mapMetaTypeToWaz(type: string): WazMediaType {
  switch (type) {
    case 'text':
      return WazMediaType.TEXT;
    case 'image':
      return WazMediaType.IMAGE;
    case 'audio':
      return WazMediaType.AUDIO;
    case 'video':
      return WazMediaType.VIDEO;
    case 'document':
      return WazMediaType.DOCUMENT;
    case 'sticker':
      return WazMediaType.STICKER;
    case 'location':
      return WazMediaType.LOCATION;
    case 'interactive':
      return WazMediaType.INTERACTIVE;
    default:
      return WazMediaType.UNKNOWN;
  }
}
//OTROS
export function extFromFilename(filename?: string | null): string | null {
  if (!filename) return null;
  const m = filename.match(/\.([a-z0-9]{1,8})$/i);
  return m ? m[1].toLowerCase() : null;
}

export function extFromMime(mime?: string | null): string | null {
  if (!mime) return null;

  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',

    'application/pdf': 'pdf',

    'audio/ogg': 'ogg',
    'audio/opus': 'opus',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',

    'video/mp4': 'mp4',
    'video/3gpp': '3gp',
  };

  return map[mime] ?? null;
}
