export type UploadInput = {
  buffer: Buffer;
  contentType: string; // ej: "image/png", "application/pdf"
  originalName?: string; // ej: "foto.png"
  folder?: string; // ej: "clientes/123"
  publicRead?: boolean; // default true (para CDN)

  key?: string; // 👈 NUEVO: key completo opcional
};

export type UploadResult = {
  key: string; // ruta en el bucket
  url: string; // URL final (CDN)
  bucket: string;
  contentType: string;
  size: number;
  etag?: string;
};
