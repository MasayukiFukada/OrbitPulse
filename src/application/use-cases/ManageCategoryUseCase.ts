import { Category } from "@/domain/entities/Category";
import { CategoryRepository } from "@/domain/repositories/CategoryRepository";
import { nanoid } from "nanoid";

export class ManageCategoryUseCase {
  constructor(private categoryRepository: CategoryRepository) {}

  async getCategories(): Promise<Category[]> {
    return this.categoryRepository.findAll();
  }

  async getCategoryById(id: string): Promise<Category | null> {
    return this.categoryRepository.findById(id);
  }

  async addCategory(data: { name: string; color: string }): Promise<Category> {
    const category = new Category(nanoid(), data.name, data.color);
    await this.categoryRepository.save(category);
    return category;
  }

  async updateCategory(id: string, data: { name: string; color: string }): Promise<void> {
    const category = await this.categoryRepository.findById(id);
    if (!category) throw new Error("Category not found");

    category.name = data.name;
    category.color = data.color;
    await this.categoryRepository.save(category);
  }

  async deleteCategory(id: string): Promise<void> {
    await this.categoryRepository.delete(id);
  }
}
