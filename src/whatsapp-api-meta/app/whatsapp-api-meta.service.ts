import { Injectable, Logger } from '@nestjs/common';
import { CreateWhatsappApiMetaDto } from '../dto/create-whatsapp-api-meta.dto';
import { UpdateWhatsappApiMetaDto } from '../dto/update-whatsapp-api-meta.dto';
import { HttpService } from '@nestjs/axios';
import { throwFatalError } from 'src/Utils/CommonFatalError';
type MetaSendMessageResponse = {
  messaging_product: 'whatsapp';
  contacts?: { input: string; wa_id: string }[];
  messages?: { id: string }[];
};

@Injectable()
export class WhatsappApiMetaService {
  private readonly logger = new Logger(WhatsappApiMetaService.name);
  constructor(private readonly http: HttpService) {}

  async sendText(to: string, text: string): Promise<MetaSendMessageResponse> {
    try {
      const response = await this.http.axiosRef.post('/messages', {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      });

      this.logger.log(`Mensaje enviado a ${to}. Status: ${response.status}`);
      this.logger.debug(JSON.stringify(response.data));

      return response.data as MetaSendMessageResponse; //  aquí viene messages[0].id
    } catch (error) {
      throwFatalError(error, this.logger, 'WhatsappApiMetaService -sendText');
    }
  }
}
