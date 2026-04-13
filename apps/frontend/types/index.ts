export type UserRole = "admin" | "manager" | "member";
export type UserStatus = "active" | "inactive";

export interface User {
  user_id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone?: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = "active" | "on_hold" | "completed" | "archived";

export interface Project {
  project_id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  start_date?: string;
  end_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  members?: ProjectMember[];
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user?: User;
}

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface Task {
  task_id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string;
  created_by: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  assignee?: User;
}

export interface Milestone {
  milestone_id: string;
  project_id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
