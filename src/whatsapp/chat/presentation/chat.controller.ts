import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { WhatsAppMessageService } from '../app/whatsapp-chat.service';
import { FindWhatsappMessagesQueryDto } from '../dto/find-whatsapp-messages.query';
import { CreateWhatsappMessageDto } from '../dto/create.dto';
import { WhatsappMessageProps } from '../dto/create-chat.dto';
import { SearchWhatsappMessageDto } from '../dto/query';

@Controller('whatsapp-chat') // si quieres, cámbialo a 'whatsapp-messages'
export class ChatController {
  constructor(private readonly chatService: WhatsAppMessageService) {}

  @Post()
  create(@Body() dto: WhatsappMessageProps) {
    return this.chatService.create(dto);
  }

  @Get()
  findAll(@Query() q: FindWhatsappMessagesQueryDto) {
    return this.chatService.findAll(q);
  }

  @Get('cliente/:id')
  async getClienteWithHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query() q: SearchWhatsappMessageDto,
  ) {
    return this.chatService.getClienteWithHistorial(id, q);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.chatService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.chatService.remove(id);
  }
}
