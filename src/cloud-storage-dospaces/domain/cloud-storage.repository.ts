import { UploadInput, UploadResult } from './types';

export interface CloudStorageRepository {
  upload(input: UploadInput): Promise<UploadResult>;
  delete(key: string): Promise<void>;
}
