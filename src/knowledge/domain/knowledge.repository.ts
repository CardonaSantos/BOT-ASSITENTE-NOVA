import { Knowledge } from '../entities/knowledge.entity';

export const KNOWLEDGE_REPOSITORY = Symbol('KNOWLEDGE_REPOSITORY');

export interface KnowledgeRepository {
  create(knowledge: Knowledge): Promise<Knowledge>;
  update(id: number, data: Partial<Knowledge>): Promise<Knowledge>;
  findById(id: number): Promise<Knowledge | null>;
  deleteById(id: number): Promise<Knowledge | null>;
  findAllByEmpresa(empresaId: number): Promise<Knowledge[]>;

  findAll(): Promise<Knowledge[]>;

  getAllKnowledge(): Promise<string>;
}
