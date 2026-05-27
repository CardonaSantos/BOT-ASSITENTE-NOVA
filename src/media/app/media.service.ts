import { Inject, Injectable } from '@nestjs/common';
import { CreateMediaDto } from '../dto/create-media.dto';
import { UpdateMediaDto } from '../dto/update-media.dto';
import {
  MEDIA_REPOSITORY_TK,
  MediaRepository,
} from '../domain/media.repository';
import { QueryMediaSearch } from '../dto/query.dto';

@Injectable()
export class MediaService {
  constructor(
    @Inject(MEDIA_REPOSITORY_TK)
    private readonly repo: MediaRepository,
  ) {}

  async MediaGaleryMessages(dto: QueryMediaSearch) {
    return await this.repo.get_all_media_with_search(dto);
  }
}
