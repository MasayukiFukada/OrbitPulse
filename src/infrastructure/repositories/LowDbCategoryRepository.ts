import { CategoryRepository } from "@/domain/repositories/CategoryRepository";
import { Category } from "@/domain/entities/Category";
import { getDb, RawCategory } from "../db/json-db";

export class LowDbCategoryRepository implements CategoryRepository {
  async findAll(): Promise<Category[]> {
    const db = await getDb();
    await db.read();
    
    // システム専用のイグナイトガチャカテゴリがない場合は自動作成
    const hasIgnite = db.data.categories.some((c: RawCategory) => c.id === "ignite-gacha");
    if (!hasIgnite) {
      db.data.categories.push({
        id: "ignite-gacha",
        name: "イグナイトガチャ",
        color: "#ff5722" // 点火をイメージしたオレンジ
      });
      await db.write();
    }

    return db.data.categories.map((c: RawCategory) => this.toEntity(c));
  }

  async findById(id: string): Promise<Category | null> {
    const db = await getDb();
    await db.read();
    const found = db.data.categories.find((c: RawCategory) => c.id === id);
    return found ? this.toEntity(found) : null;
  }

  async save(item: Category): Promise<void> {
    const db = await getDb();
    await db.read();
    const raw = this.toRaw(item);
    const index = db.data.categories.findIndex((c: RawCategory) => c.id === item.id);

    if (index !== -1) {
      db.data.categories[index] = raw;
    } else {
      db.data.categories.push(raw);
    }

    await db.write();
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.read();
    db.data.categories = db.data.categories.filter((c: RawCategory) => c.id !== id);
    await db.write();
  }

  private toEntity(data: RawCategory): Category {
    return new Category(
      data.id,
      data.name,
      data.color
    );
  }

  private toRaw(item: Category): RawCategory {
    return {
      id: item.id,
      name: item.name,
      color: item.color
    };
  }
}
