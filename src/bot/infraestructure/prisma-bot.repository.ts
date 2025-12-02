import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Bot } from '../entities/bot.entity';
import { throwFatalError } from 'src/Utils/CommonFatalError';
import { PrismaService } from 'src/prisma/prisma-service/prisma-service.service';
import { BotStatus } from '@prisma/client';

@Injectable()
export class BotRepository implements BotRepository {
  private readonly logger = new Logger(BotRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  private toDomain(row: any): Bot | null {
    if (!row) return null;

    return new Bot(
      row.id,
      row.empresaId,

      row.nombre,
      row.slug,
      row.descripcion ?? null,

      row.provider,
      row.model,

      row.systemPrompt,
      row.contextPrompt ?? null,
      row.historyPrompt ?? null,
      row.outputStyle ?? null,

      row.maxCompletionTokens,
      row.temperature,
      row.topP,
      row.frequencyPenalty,
      row.presencePenalty,
      row.maxHistoryMessages,

      row.status as BotStatus,

      row.creadoEn ?? undefined,
      row.actualizadoEn ?? undefined,
    );
  }

  async create(bot: Bot): Promise<Bot> {
    try {
      const row = await this.prisma.bot.create({
        data: {
          empresaId: bot.empresaId,
          nombre: bot.nombre,
          slug: bot.slug,
          descripcion: bot.descripcion,

          provider: bot.provider,
          model: bot.model,

          systemPrompt: bot.systemPrompt,
          contextPrompt: bot.contextPrompt,
          historyPrompt: bot.historyPrompt,
          outputStyle: bot.outputStyle,

          maxCompletionTokens: bot.maxCompletionTokens,
          temperature: bot.temperature,
          topP: bot.topP,
          frequencyPenalty: bot.frequencyPenalty,
          presencePenalty: bot.presencePenalty,
          maxHistoryMessages: bot.maxHistoryMessages,

          status: bot.status,
        },
      });
      return this.toDomain(row);
    } catch (error) {
      throwFatalError(error, this.logger, 'PrismaBotRepository -create');
    }
  }

  async findAll(): Promise<Array<Bot>> {
    try {
      const rows = await this.prisma.bot.findMany({
        select: {},
      });

      const isValidArray = Array.isArray(rows);

      if (!isValidArray) throw new BadRequestException('Filas no válidas');

      const formatted = rows.map((r) => this.toDomain(r));

      return formatted;
    } catch (error) {
      throwFatalError(error, this.logger, 'PrismaBotRepository -findAll');
    }
  }

  async findAllByEmpresa(empresaId: number): Promise<Bot[]> {
    try {
      const rows = await this.prisma.bot.findMany({
        where: {
          empresaId,
        },
      });

      const isValidArray = Array.isArray(rows);

      if (!isValidArray) throw new BadRequestException('Filas no válidas');

      const formatted = rows.map((r) => this.toDomain(r));

      return formatted;
    } catch (error) {
      throwFatalError(
        error,
        this.logger,
        'PrismaBotRepository -findAllByEmpresa',
      );
    }
  }

  async findById(id: number): Promise<Bot | null> {
    try {
      const row = await this.prisma.bot.findUnique({
        where: {
          id,
        },
      });

      return this.toDomain(row);
    } catch (error) {
      throwFatalError(error, this.logger, 'PrismaBotRepository -findById');
    }
  }

  async update(id: number, data: Partial<Bot>): Promise<Bot> {
    try {
      const rowToUpdate = await this.prisma.bot.update({
        where: {
          id,
        },
        data: data,
      });

      return this.toDomain(rowToUpdate);
    } catch (error) {
      throwFatalError(error, this.logger, 'PrismaBotRepository -update');
    }
  }
}
