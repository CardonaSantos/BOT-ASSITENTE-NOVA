// src/cloud-storage-dospaces/domain/interfaces/uploaded-file.interface.ts
export interface IUploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}
