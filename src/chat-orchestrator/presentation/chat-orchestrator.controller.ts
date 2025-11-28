import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ChatOrchestratorService } from '../app/chat-orchestrator.service';
import { CreateChatOrchestratorDto } from '../dto/create-chat-orchestrator.dto';
import { UpdateChatOrchestratorDto } from '../dto/update-chat-orchestrator.dto';

@Controller('chat-orchestrator')
export class ChatOrchestratorController {
  constructor(
    private readonly chatOrchestratorService: ChatOrchestratorService,
  ) {}
}
