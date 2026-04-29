import { BacklogItem, BacklogItemStatus } from "@/domain/entities/BacklogItem";
import { BacklogRepository } from "@/domain/repositories/BacklogRepository";
import { nanoid } from "nanoid";

export class ManageBacklogUseCase {
  constructor(private backlogRepository: BacklogRepository) {}

  async getBacklogItems(): Promise<BacklogItem[]> {
    return this.backlogRepository.findAll();
  }

  async addBacklogItem(data: {
    subject?: string;
    title: string;
    why: string;
    description?: string;
    acceptanceCriteria?: string;
    storyPoints?: number;
  }): Promise<BacklogItem> {
    const newItem = new BacklogItem(
      nanoid(),
      data.subject || "私",
      data.title,
      data.why,
      data.description || null,
      data.acceptanceCriteria || null,
      data.storyPoints || 0,
      "backlog"
    );
    await this.backlogRepository.save(newItem);
    return newItem;
  }

  async updateBacklogItem(id: string, data: {
    subject?: string;
    title: string;
    why: string;
    description?: string;
    acceptanceCriteria?: string;
    storyPoints?: number;
  }): Promise<void> {
    const item = await this.backlogRepository.findById(id);
    if (!item) throw new Error("Item not found");

    if (data.subject !== undefined) item.subject = data.subject;
    item.title = data.title;
    item.why = data.why;
    item.description = data.description || null;
    item.acceptanceCriteria = data.acceptanceCriteria || null;
    item.storyPoints = data.storyPoints || 0;

    await this.backlogRepository.save(item);
  }

  async updateStatus(id: string, status: BacklogItemStatus): Promise<void> {
    const item = await this.backlogRepository.findById(id);
    if (!item) throw new Error("Item not found");
    
    item.status = status;
    await this.backlogRepository.save(item);
  }

  async deleteItem(id: string): Promise<void> {
    await this.backlogRepository.delete(id);
  }
}
