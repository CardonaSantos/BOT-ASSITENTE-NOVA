import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BroadCastMessageService {
  private readonly logger = new Logger(BroadCastMessageService.name);

  constructor(private readonly config: ConfigService) {}

  // Lo cambié a public para que puedas llamarlo desde tu Orquestador u otros servicios
  async notifyCrmUI(event: string, data: any) {
    this.logger.log(`BROADCAST:-> sending event [${event}]`);

    const crmUrl = this.config.get<string>('CRM_API_URL');
    const secret = this.config.get<string>('INTERNAL_SECRET');

    try {
      const response = await fetch(`${crmUrl}/internal/server/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': secret,
        },
        body: JSON.stringify({
          event,
          data,
        }),
      });

      // Fetch no lanza error en 404 o 500, hay que verificar .ok manualment
      if (!response.ok) {
        throw new Error(
          `Error del servidor CRM: ${response.status} ${response.statusText}`,
        );
      }

      // const resData = await response.json();
    } catch (err: any) {
      this.logger.error('No se pudo notificar al CRM UI', err.message);
    }
  }
}
