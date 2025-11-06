// frontend/types/entities.ts

export type TypeEntity = {
  id: number;
  name: string;
  color?: string | null;
};

export type TaskEntity = {
  id: number;
  type_id: number;
  title: string;
  description?: string | null;
  status?: string | null;
  created_at?: string | null;  // ISO string
};

export type SubtaskEntity = {
  id: number;
  task_id: number;
  title: string;
  done: boolean;       // boolean for UI (backend may store 0/1)
  order_index: number; // default 0
};

export type EventEntity = {
  id: string;
  calendar_id: string;
  title: string;
  start: string; // ISO instant
  end: string;   // ISO instant
  rrule?: string | null;
  type_id?: number | null;
  color?: string | null;
};

export type EventOccurrence = {
  id: string;
  event_id: string;
  title: string;
  start: string; // ISO instant
  end: string;   // ISO instant
  type_id?: number | null;
  color?: string | null;
};


