import { MediaArrayResponse } from '../common/mappers';
import { QueryMediaSearch } from '../dto/query.dto';

export const MEDIA_REPOSITORY_TK = Symbol('MEDIA_REPOSITORY_TK');

export interface MediaRepository {
  get_all_media_with_search(
    dto: QueryMediaSearch,
  ): Promise<MediaArrayResponse[]>;
}
