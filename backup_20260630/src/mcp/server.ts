import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { LowDbBacklogRepository } from "../infrastructure/repositories/LowDbBacklogRepository.js";
import { LowDbSprintRepository } from "../infrastructure/repositories/LowDbSprintRepository.js";
import { LowDbTaskRepository } from "../infrastructure/repositories/LowDbTaskRepository.js";
import { LowDbTodoTaskRepository } from "../infrastructure/repositories/LowDbTodoTaskRepository.js";
import { LowDbCapacityRepository } from "../infrastructure/repositories/LowDbCapacityRepository.js";
import { LowDbBurnDownSnapshotRepository } from "../infrastructure/repositories/LowDbBurnDownSnapshotRepository.js";
import { ManageBacklogUseCase } from "../application/use-cases/ManageBacklogUseCase.js";
import { ManageSprintUseCase } from "../application/use-cases/ManageSprintUseCase.js";
import { ManageTodoUseCase } from "../application/use-cases/ManageTodoUseCase.js";
import { SprintStatus } from "../domain/entities/Sprint.js";

// リポジトリとユースケースの初期化
const backlogRepository = new LowDbBacklogRepository();
const sprintRepository = new LowDbSprintRepository();
const taskRepository = new LowDbTaskRepository();
const todoTaskRepository = new LowDbTodoTaskRepository();
const capacityRepository = new LowDbCapacityRepository();
const burnDownSnapshotRepository = new LowDbBurnDownSnapshotRepository();

const backlogUseCase = new ManageBacklogUseCase(backlogRepository, taskRepository);
const sprintUseCase = new ManageSprintUseCase(
  sprintRepository,
  capacityRepository,
  backlogRepository,
  burnDownSnapshotRepository,
  taskRepository,
  todoTaskRepository
);
const todoUseCase = new ManageTodoUseCase(todoTaskRepository);

const server = new Server(
  {
    name: "orbit-pulse-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * 利用可能なツールのリストを返す
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_backlog_items",
        description: "未着手および進行中の全てのバックログアイテムを取得します。",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_sprints",
        description: "全スプリントの一覧を取得します。",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_current_sprint",
        description: "現在アクティブなスプリントを取得します。",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_sprint_details",
        description: "特定のスプリントの詳細（バックログアイテム、タスク、キャパシティ）を取得します。",
        inputSchema: {
          type: "object",
          properties: {
            sprintId: { type: "string", description: "スプリントID" },
          },
          required: ["sprintId"],
        },
      },
      {
        name: "get_todo_tasks",
        description: "スプリントに紐付いていないToDoタスクを取得します。",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "create_backlog_item",
        description: "新しいバックログアイテム（ストーリー）を作成します。",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "タイトル" },
            why: { type: "string", description: "なぜこれが必要か (Why)" },
            subject: { type: "string", description: "主語 (誰が)", default: "私" },
            description: { type: "string", description: "詳細内容" },
            acceptanceCriteria: { type: "string", description: "受入条件" },
            storyPoints: { type: "number", description: "ストーリーポイント", default: 0 },
          },
          required: ["title", "why"],
        },
      },
      {
        name: "add_item_to_sprint",
        description: "バックログアイテムを特定のスプリントに割り当てます。",
        inputSchema: {
          type: "object",
          properties: {
            sprintId: { type: "string", description: "スプリントID" },
            backlogItemId: { type: "string", description: "バックログアイテムID" },
          },
          required: ["sprintId", "backlogItemId"],
        },
      },
      {
        name: "update_sprint",
        description: "スプリントの目標やレトロスペクティブを更新します。",
        inputSchema: {
          type: "object",
          properties: {
            sprintId: { type: "string", description: "スプリントID" },
            goal: { type: "string", description: "スプリントの目標" },
            retrospective: { type: "string", description: "振り返り内容" },
            status: { type: "string", enum: ["planning", "active", "completed"], description: "ステータス" },
          },
          required: ["sprintId"],
        },
      },
    ],
  };
});

/**
 * ツール実行のハンドラー
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_backlog_items": {
        const items = await backlogUseCase.getBacklogItems();
        return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
      }

      case "get_sprints": {
        const sprints = await sprintUseCase.getSprints();
        return { content: [{ type: "text", text: JSON.stringify(sprints, null, 2) }] };
      }

      case "get_current_sprint": {
        const sprints = await sprintUseCase.getSprints();
        const activeSprint = sprints.find(s => s.status === "active");
        return { content: [{ type: "text", text: JSON.stringify(activeSprint || null, null, 2) }] };
      }

      case "get_sprint_details": {
        const sprintId = String(args?.sprintId);
        const sprint = await sprintUseCase.getSprintById(sprintId);
        if (!sprint) throw new Error("Sprint not found");

        const items = await sprintUseCase.getItemsInSprint(sprintId);
        const capacities = await sprintUseCase.getCapacities(sprintId);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ sprint, items, capacities }, null, 2)
          }]
        };
      }

      case "get_todo_tasks": {
        const unassigned = await todoUseCase.getUnassignedTodoTasks();
        return { content: [{ type: "text", text: JSON.stringify(unassigned, null, 2) }] };
      }

      case "create_backlog_item": {
        const item = await backlogUseCase.addBacklogItem({
          title: String(args?.title),
          why: String(args?.why),
          subject: String(args?.subject || "私"),
          description: args?.description ? String(args.description) : undefined,
          acceptanceCriteria: args?.acceptanceCriteria ? String(args.acceptanceCriteria) : undefined,
          storyPoints: Number(args?.storyPoints || 0),
        });
        return { content: [{ type: "text", text: `Created backlog item: ${item.id}` }] };
      }

      case "add_item_to_sprint": {
        await sprintUseCase.addBacklogItemToSprint(
          String(args?.sprintId),
          String(args?.backlogItemId)
        );
        return { content: [{ type: "text", text: "Successfully added item to sprint" }] };
      }

      case "update_sprint": {
        const sprintId = String(args?.sprintId);
        const sprint = await sprintUseCase.getSprintById(sprintId);
        if (!sprint) throw new Error("Sprint not found");

        await sprintUseCase.updateSprint(sprintId, {
          name: sprint.name,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          goal: args?.goal !== undefined ? String(args.goal) : sprint.goal || undefined,
          retrospective: args?.retrospective !== undefined ? String(args.retrospective) : sprint.retrospective || undefined,
          status: args?.status ? (args.status as SprintStatus) : sprint.status,
        });
        return { content: [{ type: "text", text: "Successfully updated sprint" }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: "text", text: error.message }],
    };
  }
});

/**
 * サーバーを起動
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OrbitPulse MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
