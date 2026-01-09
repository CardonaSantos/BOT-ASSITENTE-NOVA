import { HttpException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SearchDto } from '../dto/pos-functions.dto';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

interface SearchResult {
  nombre: string;
  cantidadDisponible: Record<string, number>;
  precio: number;
}
@Injectable()
export class PosFunctionsService {
  private readonly logger = new Logger(PosFunctionsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  async search(dto: SearchDto): Promise<Array<SearchResult>> {
    const POS_ERP = this.config.get('POS_ERP');
    const INTERNAL_SECRET = this.config.get('INTERNAL_SECRET');

    const url = `${POS_ERP}/bot-functions/make-search-products`;

    console.log('Mi url ERP es: ', POS_ERP);

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<Array<SearchResult>>(url, dto, {
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
