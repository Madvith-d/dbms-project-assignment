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

export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled"
  | "archived";

export interface Project {
  project_id: string;
  project_name: string;
  description?: string;
  status: ProjectStatus;
  start_date?: string;
  end_date?: string;
  budget?: number;
  created_by: string;
  created_at: string;
  updated_at?: string;
  members?: ProjectMember[];
  member_count?: number;
}

export interface ProjectMember {
  project_member_id: number;
  project_id: string;
  user_id?: string;
  assigned_role: string;
  joined_date: string;
  user?: User;
}

export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  task_id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  sort_order?: number;
  assigned_to?: string | number | null;
  assignee_id?: string;
  parent_task_id?: string;
  created_by: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  assignee?: User;
  labels?: Label[];
  subtask_count?: number;
  completed_subtask_count?: number;
  attachment_count?: number;
}

export interface Label {
  label_id: number;
  project_id: number;
  name: string;
  color: string;
  created_at: string;
}

export type MilestoneStatus =
  | "upcoming"
  | "in_progress"
  | "completed"
  | "missed";

export interface Milestone {
  milestone_id: string;
  project_id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: MilestoneStatus;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  comment_id: string;
  task_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface Attachment {
  attachment_id: string;
  task_id: string;
  file_name: string;
  uploaded_at: string;
  uploaded_by: string;
  uploader?: User;
}

export interface TimeLog {
  time_log_id: string;
  task_id: string;
  user_id: string;
  hours_logged: number;
  log_date: string;
  description?: string;
  user?: User;
}

export interface DashboardStats {
  total_projects: number;
  active_projects: number;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface ActivityLog {
  activity_id: number;
  project_id: number;
  actor_user_id: number;
  entity_type: "TASK" | "PROJECT" | "MILESTONE" | "COMMENT" | "ATTACHMENT";
  entity_id: number;
  action:
    | "CREATED"
    | "UPDATED"
    | "DELETED"
    | "STATUS_CHANGED"
    | "ASSIGNED"
    | "COMMENTED"
    | "UPLOADED_ATTACHMENT"
    | "LOGGED_TIME"
    | "LABELS_UPDATED";
  summary: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  actor?: Pick<User, "user_id" | "first_name" | "last_name" | "email">;
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
