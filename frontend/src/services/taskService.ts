import api from "@/lib/api";
import { Task, TaskFilters, TasksResponse, TaskStatus } from "@/types";

export const taskService = {
  getAll: async (filters: TaskFilters = {}): Promise<TasksResponse> => {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.search) params.set("search", filters.search);
    if (filters.profileId) params.set("profileId", filters.profileId);
    const { data } = await api.get(`/tasks?${params.toString()}`);
    return data;
  },

  getOne: async (id: string): Promise<Task> => {
    const { data } = await api.get(`/tasks/${id}`);
    return data;
  },

  create: async (payload: Partial<Task>): Promise<Task> => {
    const { data } = await api.post("/tasks", payload);
    return data;
  },

  update: async (id: string, payload: Partial<Task>): Promise<Task> => {
    const { data } = await api.patch(`/tasks/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },

  toggle: async (id: string): Promise<Task> => {
    const { data } = await api.patch(`/tasks/${id}/toggle`);
    return data;
  },

  getComments: async (taskId: string) => {
    const { data } = await api.get(`/comments/${taskId}`);
    return data;
  },

  addComment: async (payload: {
    taskId: string;
    message: string;
    status: TaskStatus;
  }) => {
    const { data } = await api.post("/comments", payload);
    return data;
  },

  getHistory: async (taskId: string) => {
    const { data } = await api.get(`/tasks/history/${taskId}`);
    return data;
  },
};
