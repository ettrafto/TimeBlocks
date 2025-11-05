// src/api/createPageApi.js
import { apiRequest } from '../services/api.js';
import { newCorrelationId } from '../../shared/logging/correlation.js';

export const api = {
  // Types
  listTypes: () => apiRequest("/api/types", { correlationId: newCorrelationId("api-types") }),
  
  createType: (p) => apiRequest("/api/types", {
    method: "POST",
    body: { name: p.name, color: p.color },
    correlationId: newCorrelationId("api-create-type")
  }),
  
  updateType: (id, p) => apiRequest(`/api/types/${id}`, {
    method: "PATCH",
    body: p,
    correlationId: newCorrelationId("api-update-type")
  }),
  
  deleteType: (id) => apiRequest(`/api/types/${id}`, {
    method: "DELETE",
    correlationId: newCorrelationId("api-delete-type")
  }),
  
  // Tasks
  listTasksByType: (typeId) => apiRequest(`/api/tasks?typeId=${typeId}`, {
    correlationId: newCorrelationId("api-tasks")
  }),
  
  createTask: (p) => apiRequest("/api/tasks", {
    method: "POST",
    body: { 
      type_id: p.type_id, 
      title: p.title, 
      description: p.description, 
      status: p.status 
    },
    correlationId: newCorrelationId("api-create-task")
  }),
  
  updateTask: (id, p) => apiRequest(`/api/tasks/${id}`, {
    method: "PATCH",
    body: p,
    correlationId: newCorrelationId("api-update-task")
  }),
  
  deleteTask: (id) => apiRequest(`/api/tasks/${id}`, {
    method: "DELETE",
    correlationId: newCorrelationId("api-delete-task")
  }),
  
  // Subtasks
  listSubtasks: (taskId) => apiRequest(`/api/subtasks?taskId=${taskId}`, {
    correlationId: newCorrelationId("api-subtasks")
  }),
  
  createSubtask: (p) => apiRequest("/api/subtasks", {
    method: "POST",
    body: { task_id: p.task_id, title: p.title },
    correlationId: newCorrelationId("api-create-subtask")
  }),
  
  updateSubtask: (id, p) => apiRequest(`/api/subtasks/${id}`, {
    method: "PATCH",
    body: p,
    correlationId: newCorrelationId("api-update-subtask")
  }),
  
  deleteSubtask: (id) => apiRequest(`/api/subtasks/${id}`, {
    method: "DELETE",
    correlationId: newCorrelationId("api-delete-subtask")
  }),
};

