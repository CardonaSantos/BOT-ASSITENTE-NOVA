import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudStorageService } from '../app/cloud-storage-dospaces.service';

@Controller('storage')
export class CloudStorageController {
  constructor(private readonly storage: CloudStorageService) {}
}
