import { Injectable } from '@nestjs/common';
import { CreateEmbeddingDto } from './dto/create-embedding.dto';
import { UpdateEmbeddingDto } from './dto/update-embedding.dto';

@Injectable()
export class EmbeddingsService {
  create(createEmbeddingDto: CreateEmbeddingDto) {
    return 'This action adds a new embedding';
  }

  findAll() {
    return `This action returns all embeddings`;
  }

  findOne(id: number) {
    return `This action returns a #${id} embedding`;
  }

  update(id: number, updateEmbeddingDto: UpdateEmbeddingDto) {
    return `This action updates a #${id} embedding`;
  }

  remove(id: number) {
    return `This action removes a #${id} embedding`;
  }
}
