import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CreateKnowledgeDto } from '../dto/create-knowledge.dto';
import { UpdateKnowledgeDto } from '../dto/update-knowledge.dto';
import { KnowledgeService } from '../app/knowledge.service';

@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}
}
