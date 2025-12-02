import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBotDto } from '../dto/create-bot.dto';
import { UpdateBotDto } from '../dto/update-bot.dto';
import { BOT_REPOSITORY, BotRepository } from '../domain/bot.repository';
import { Bot } from '../entities/bot.entity';
import { BotStatus } from '@prisma/client';

@Injectable()
export class BotService {
  constructor(
    @Inject(BOT_REPOSITORY)
    private readonly repo: BotRepository,
  ) {}

  async create(dto: CreateBotDto): Promise<Bot> {
    const newBot = Bot.create({
      empresaId: dto.empresaId,
      nombre: dto.nombre,
      slug: dto.slug,
      descripcion: dto.descripcion,

      provider: dto.provider,
      model: dto.model,

      systemPrompt: dto.systemPrompt,
      contextPrompt: dto.contextPrompt,
      historyPrompt: dto.historyPrompt,
      outputStyle: dto.outputStyle,

      maxCompletionTokens: dto.maxCompletionTokens,
      temperature: dto.temperature,
      topP: dto.topP,
      frequencyPenalty: dto.frequencyPenalty,
      presencePenalty: dto.presencePenalty,
      maxHistoryMessages: dto.maxHistoryMessages,

      status: dto.status,
    });

    const bot = await this.repo.create(newBot);
    return bot;
  }

  async findAll(): Promise<Bot[]> {
    return this.repo.findAll();
  }

  async findOne(id: number): Promise<Bot> {
    const bot = await this.repo.findById(id);
    if (!bot) {
      throw new NotFoundException(`Bot con id ${id} no encontrado`);
    }
    return bot;
  }

  async update(id: number, dto: UpdateBotDto): Promise<Bot> {
    // Opcional pero sano: validar que existe antes
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Bot con id ${id} no encontrado`);
    }

    const data: Partial<Bot> = {};

    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.descripcion !== undefined)
      data.descripcion = dto.descripcion ?? null;

    if (dto.provider !== undefined) data.provider = dto.provider;
    if (dto.model !== undefined) data.model = dto.model;

    if (dto.systemPrompt !== undefined) data.systemPrompt = dto.systemPrompt;
    if (dto.contextPrompt !== undefined)
      data.contextPrompt = dto.contextPrompt ?? null;
    if (dto.historyPrompt !== undefined)
      data.historyPrompt = dto.historyPrompt ?? null;
    if (dto.outputStyle !== undefined)
      data.outputStyle = dto.outputStyle ?? null;

    if (dto.maxCompletionTokens !== undefined)
      data.maxCompletionTokens = dto.maxCompletionTokens;
    if (dto.temperature !== undefined) data.temperature = dto.temperature;
    if (dto.topP !== undefined) data.topP = dto.topP;
    if (dto.frequencyPenalty !== undefined)
      data.frequencyPenalty = dto.frequencyPenalty;
    if (dto.presencePenalty !== undefined)
      data.presencePenalty = dto.presencePenalty;
    if (dto.maxHistoryMessages !== undefined)
      data.maxHistoryMessages = dto.maxHistoryMessages;

    if (dto.status !== undefined) data.status = dto.status;

    const bot = await this.repo.update(id, data);
    return bot;
  }

  // Soft delete: marcamos el bot como DISABLED
  async remove(id: number): Promise<Bot> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Bot con id ${id} no encontrado`);
    }

    const updated = await this.repo.update(id, { status: BotStatus.DISABLED });
    return updated;
  }
}
