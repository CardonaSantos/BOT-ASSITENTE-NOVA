import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { KnowledgeService } from '../app/knowledge.service';
import { CreateKnowledgeDocumentDto } from '../dto/create-knowledge-document.dto';
import { UpdateKnowledgeDto } from '../dto/update-knowledge.dto';

@Controller('knowledge')
export class KnowledgeController {
  private readonly logger = new Logger(KnowledgeController.name);
  constructor(private readonly knowledgeService: KnowledgeService) {}

  // CREATE
  @Post()
  create(@Body() dto: CreateKnowledgeDocumentDto) {
    return this.knowledgeService.createNewKnowledge(dto);
  }

  // GET ALL BY EMPRESA
  @Get('empresa/:empresaId')
  findAllByEmpresa(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.knowledgeService.findAllByEmpresa(empresaId);
  }

  @Get('')
  findAllKnowledge() {
    return this.knowledgeService.findAllKnowledge();
  }

  // GET ONE
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.knowledgeService.findOne(id);
  }

  // UPDATE
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKnowledgeDto,
  ) {
    this.logger.log('DTO: ', dto);
    return this.knowledgeService.updateKnowledge(id, dto);
  }

  // DELETE
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.knowledgeService.deleteKnowledge(id);
  }

  // SEARCH RAG
  @Get('search/:empresaId')
  search(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query('q') q: string,
    @Query('limit') limit = '5',
  ) {
    const topK = Number(limit) || 5;
    return this.knowledgeService.search(empresaId, q, topK);
  }
}
