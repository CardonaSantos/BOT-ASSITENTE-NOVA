import { Injectable } from '@nestjs/common';
import { MediaRepository } from '../domain/media.repository';
import { QueryMediaSearch } from '../dto/query.dto';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';
import { Prisma } from '@prisma/client';

import { dayjs } from 'src/Utils/dayjs.config';
import { mapMediaArray, MediaDataArray } from '../common/mappers';

@Injectable()
export class PrismaMediaRepository implements MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get_all_media_with_search(dto: QueryMediaSearch) {
    const { clienteId, direction, endDate, startDate, type } = dto;

    const where: Prisma.WhatsappMessageWhereInput = {};

    where.type = {
      in: ['DOCUMENT', 'IMAGE', 'AUDIO', 'VIDEO'],
    };

    if (clienteId) {
      where.clienteId = {
        equals: clienteId,
      };
    }

    if (direction) {
      where.direction = {
        equals: direction,
      };
    }

    if (startDate || endDate) {
      const rango: Prisma.DateTimeFilter = {};

      if (startDate) {
        rango.gte = dayjs(startDate).startOf('day').toDate();
      }

      if (endDate) {
        rango.lt = dayjs(endDate).add(1, 'day').startOf('day').toDate();
      }

      where.creadoEn = rango;
    }

    const records: Array<MediaDataArray> =
      await this.prisma.whatsappMessage.findMany({
        where,
        orderBy: {
          creadoEn: 'desc',
        },
        select: {
          body: true,
          creadoEn: true,
          actualizadoEn: true,
          type: true,
          direction: true,
          id: true,
          status: true,
          wamid: true,
          from: true,
          to: true,
          mediaUrl: true,
          cliente: {
            select: {
              id: true,
              nombre: true,
              telefono: true,
            },
          },
        },
      });

    return mapMediaArray(records);
  }
}
