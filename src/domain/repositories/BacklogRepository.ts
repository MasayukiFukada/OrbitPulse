import { BacklogItem } from "../entities/BacklogItem";

export interface BacklogRepository {
  findAll(): Promise<BacklogItem[]>;
  findById(id: string): Promise<BacklogItem | null>;
  save(item: BacklogItem): Promise<void>;
  delete(id: string): Promise<void>;
}
