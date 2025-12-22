import { HttpException, Injectable, Logger } from '@nestjs/common';
import { CreateCrmDto } from '../dto/create-crm.dto';
import { UpdateCrmDto } from '../dto/update-crm.dto';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { throwFatalError } from 'src/Utils/CommonFatalError';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface TicketFromCrmCreado {
  id: number;
  titulo: string;
  descripcion: string;
}

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateCrmDto): Promise<TicketFromCrmCreado> {
    const CRM_API_URL = this.config.get('CRM_API_URL');
    const INTERNAL_SECRET = this.config.get('INTERNAL_SECRET');

    const url = `${CRM_API_URL}/crm-bot-functions/create-ticket`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<TicketFromCrmCreado>(url, dto, {
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': INTERNAL_SECRET,
          },
        }),
      );

      this.logger.log(`El ticket creado es:\n${JSON.stringify(data, null, 2)}`);

      return data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new HttpException(
        axiosError.response?.data || 'Error conectando al CRM',
        axiosError.response?.status || 500,
      );
    }
  }
}
