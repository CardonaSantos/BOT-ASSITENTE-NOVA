import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreateMediaDto } from '../dto/create-media.dto';
import { UpdateMediaDto } from '../dto/update-media.dto';
import {
  MEDIA_REPOSITORY_TK,
  MediaRepository,
} from '../domain/media.repository';
import { QueryMediaSearch } from '../dto/query.dto';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  constructor(
    @Inject(MEDIA_REPOSITORY_TK)
    private readonly repo: MediaRepository,
  ) {}

  async MediaGaleryMessages(dto: QueryMediaSearch) {
    this.logger.log(`Query recibido:\n${JSON.stringify(dto, null, 2)}`);
    return await this.repo.get_all_media_with_search(dto);
  }
}
