// frontend/api/create.ts
import { http } from "./http";
import type { TypeEntity, TaskEntity, SubtaskEntity } from "../types/entities";

// TYPES
export const listTypes = (): Promise<TypeEntity[]> =>
  http("/api/types");

export const createType = (p: { name: string; color?: string }) =>
  http<TypeEntity>("/api/types", { method: "POST", body: p });

export const updateType = (id: number, p: Partial<Pick<TypeEntity, "name" | "color">>) =>
  http<TypeEntity>(`/api/types/${id}`, { method: "PATCH", body: p });

export const deleteType = (id: number) =>
  http<{ ok: true }>(`/api/types/${id}`, { method: "DELETE" });

// TASKS
export const listTasksByType = (typeId: number): Promise<TaskEntity[]> =>
  http(`/api/tasks?typeId=${typeId}`);

export const createTask = (p: { type_id: number; title: string; description?: string; status?: string }) =>
  http<TaskEntity>("/api/tasks", { method: "POST", body: p });

export const updateTask = (id: number, p: Partial<TaskEntity>) =>
  http<TaskEntity>(`/api/tasks/${id}`, { method: "PATCH", body: p });

export const deleteTask = (id: number) =>
  http<{ ok: true }>(`/api/tasks/${id}`, { method: "DELETE" });

// SUBTASKS
export const listSubtasks = (taskId: number): Promise<SubtaskEntity[]> =>
  http(`/api/subtasks?taskId=${taskId}`);

export const createSubtask = (p: { task_id: number; title: string }) =>
  http<SubtaskEntity>("/api/subtasks", { method: "POST", body: p });

export const updateSubtask = (id: number, p: Partial<Pick<SubtaskEntity,"title"|"done"|"order_index">>) =>
  http<SubtaskEntity>(`/api/subtasks/${id}`, { method: "PATCH", body: p });

export const deleteSubtask = (id: number) =>
  http<{ ok: true }>(`/api/subtasks/${id}`, { method: "DELETE" });


