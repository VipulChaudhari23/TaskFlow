export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Profile {
  id: string;
  name: string;
  avatarColor: string;
  userId: string;
  createdAt: string;
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: Priority;
  progress: number; // ✅ NEW
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  // userId: string;
  profileId: string;
}

export interface TaskComment {
  id: string;
  message: string;
  status: TaskStatus;
  createdAt: string;
  taskId: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TasksResponse {
  tasks: Task[];
  pagination: Pagination;
}

export interface TaskFilters {
  page?: number;
  limit?: number;
  status?: TaskStatus | '';
  priority?: Priority | '';
  search?: string;
  profileId?: string;
}

export interface TaskHistory {
  id: string;
  action: string;
  changes: string; // JSON string
  createdAt: string;
}