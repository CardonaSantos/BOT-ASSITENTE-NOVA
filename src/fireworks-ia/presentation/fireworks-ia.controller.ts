import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { FireworksIaService } from '../app/fireworks-ia.service';
import { CreateFireworksIaDto } from '../dto/create-fireworks-ia.dto';

@Controller('fireworks-ia')
export class FireworksIaController {
  constructor(private readonly fireworksIaService: FireworksIaService) {}
  @Post('embed-test')
  async embedTest(@Body() body: { text: string }) {
    const embedding = await this.fireworksIaService.embedText(body.text);

    return {
      dimension: embedding.length,
      // solo mostramos los primeros valores para no matar el JSON
      preview: embedding.slice(0, 8),
    };
  }
}
