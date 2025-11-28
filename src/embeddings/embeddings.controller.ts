import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service';
import { CreateEmbeddingDto } from './dto/create-embedding.dto';
import { UpdateEmbeddingDto } from './dto/update-embedding.dto';

@Controller('embeddings')
export class EmbeddingsController {
  constructor(private readonly embeddingsService: EmbeddingsService) {}

  @Post()
  create(@Body() createEmbeddingDto: CreateEmbeddingDto) {
    return this.embeddingsService.create(createEmbeddingDto);
  }

  @Get()
  findAll() {
    return this.embeddingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.embeddingsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEmbeddingDto: UpdateEmbeddingDto) {
    return this.embeddingsService.update(+id, updateEmbeddingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.embeddingsService.remove(+id);
  }
}
