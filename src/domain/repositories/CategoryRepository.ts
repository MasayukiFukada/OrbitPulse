import { Category } from "../entities/Category";

export interface CategoryRepository {
  findAll(): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  save(category: Category): Promise<void>;
  delete(id: string): Promise<void>;
}
