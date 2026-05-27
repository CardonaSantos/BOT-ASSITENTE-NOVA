import { HttpException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BotListarCatalogoDto, SearchDto } from '../dto/pos-functions.dto';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { BotListarCatalogoResponse } from '../dto/listar-productos-pos-response.dto';

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

  async listar_catalogo_pos(
    dto: BotListarCatalogoDto,
  ): Promise<BotListarCatalogoResponse> {
    const POS_ERP = this.config.get('POS_ERP');
    const INTERNAL_SECRET = this.config.get('INTERNAL_SECRET');

    const url = `${POS_ERP}/bot-functions/listar-productos-pos`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<BotListarCatalogoResponse>(url, dto, {
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': INTERNAL_SECRET,
          },
        }),
      );

      this.logger.log(
        `Catálogo POS recibido:\n${JSON.stringify(
          {
            totalGrupos: Array.isArray(data) ? data.length : 0,
            preview: Array.isArray(data)
              ? data.slice(0, 8).map((g) => ({
                  categoria: g.categoria?.nombre,
                  totalProductosRelacionados: g.totalProductosRelacionados,
                  totalConStock: g.totalConStock,
                  totalParaPedido: g.totalParaPedido,
                  ejemplos: g.ejemplos?.slice(0, 5).map((p) => ({
                    id: p.id,
                    nombre: p.nombre,
                    precio: p.precio,
                    totalDisponible: p.totalDisponible,
                    inventarioEstado: p.inventarioEstado,
                  })),
                }))
              : [],
          },
          null,
          2,
        )}`,
      );

      return data;
    } catch (error) {
      const axiosError = error as AxiosError;

      throw new HttpException(
        axiosError.response?.data || 'Error conectando al POS ERP',
        axiosError.response?.status || 500,
      );
    }
  }
}
