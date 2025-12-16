import { WazDirection } from '@prisma/client';

export interface MediaData {
  mediaId: string;
  kind: WaMediaType;
  direction?: WazDirection;
  mimeType?: string | null;
  filename?: string | null;
  extension?: string | null; // inferida
}

export type WaMediaType =
  | 'image'
  | 'document'
  | 'audio'
  | 'video'
  | 'sticker'
  | 'other';
