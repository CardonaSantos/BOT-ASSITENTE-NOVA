import { PartialType } from '@nestjs/mapped-types';
import { CreateChatOrchestratorDto } from './create-chat-orchestrator.dto';

export class UpdateChatOrchestratorDto extends PartialType(CreateChatOrchestratorDto) {}
