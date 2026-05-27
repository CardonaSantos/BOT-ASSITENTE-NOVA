import { WazDirection, WazMediaType } from '@prisma/client';

export class QueryMediaSearch {
  creadoEn: string;
  clienteId: number;

  startDate: string;
  endDate: string;

  type: WazMediaType;
  direction: WazDirection;
}
