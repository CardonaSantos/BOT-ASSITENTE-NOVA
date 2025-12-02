import { Bot } from '../entities/bot.entity';

// EMPRESA, ES LA ENTIDAD
export const BOT_REPOSITORY = Symbol('BOT_REPOSITORY');

export interface BotRepository {
  create(bot: Bot): Promise<Bot>;
  update(id: number, data: Partial<Bot>): Promise<Bot>;
  findById(id: number): Promise<Bot | null>;
  findAll(): Promise<Array<Bot>>;
  findAllByEmpresa(empresaId: number): Promise<Bot[]>;

  //CONOCIMIENTOS
}
