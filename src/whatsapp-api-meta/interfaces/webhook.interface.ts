export type WAMessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'interactive'
  | 'button'
  | 'unknown';

export interface WhatsAppMessage {
  from: string;
  id: string; // wamid
  timestamp: string;
  type: WAMessageType;

  // Dependiendo del tipo, vendrá UNO de estos objetos:
  text?: { body: string };
  image?: WAMedia;
  audio?: WAMedia & { voice: boolean }; // voice=true es nota de voz
  video?: WAMedia;
  document?: WAMedia & { filename: string };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
}

export interface WAMedia {
  id: string; // ⚠️ IMPORTANTE: Con este ID descargas la imagen
  mime_type: string; // ej: "image/jpeg"
  sha256: string;
  caption?: string; // El texto que acompaña la foto
}
