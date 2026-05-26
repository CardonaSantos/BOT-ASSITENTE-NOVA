import { Controller, Get, Query } from '@nestjs/common';
import { MediaService } from '../app/media.service';
import { QueryMediaSearch } from '../dto/query.dto';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('galery')
  findOne(@Query() q: QueryMediaSearch) {
    return this.mediaService.MediaGaleryMessages(q);
  }
}
