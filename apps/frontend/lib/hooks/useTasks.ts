"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Label, PaginationMeta, Task, TaskPriority, TaskStatus } from "@/types";

export interface TaskFilters {
  status?: TaskStatus;
  assigned_to?: string;
  priority?: TaskPriority;
  q?: string;
  due_before?: string;
  due_after?: string;
  sort?: "due_date" | "priority" | "created_at";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  label_id?: string;
}

export interface TasksQueryResult {
  data: Task[];
  meta: PaginationMeta;
}

function normalizeTask(task: Task): Task {
  const assigned = (task as Task & { assigned_to?: string | number | null }).assigned_to;
  return {
    ...task,
    assignee_id: task.assignee_id ?? (assigned != null ? String(assigned) : undefined),
    labels: task.labels ?? [],
  };
}

export function useTasks(projectId?: string, filters?: TaskFilters) {
  return useQuery({
    queryKey: ["tasks", projectId, filters],
    queryFn: async () => {
      if (!projectId) {
        const response = await api.get<{ tasks: Task[] }>("/tasks");
        return {
          data: response.data.tasks.map(normalizeTask),
          meta: {
            page: 1,
            pageSize: response.data.tasks.length,
            total: response.data.tasks.length,
          },
        } as TasksQueryResult;
      }

      const response = await api.get<{
        data?: Task[];
        tasks?: Task[];
        meta?: PaginationMeta;
      }>(`/projects/${projectId}/tasks`, { params: filters });

      const rows = (response.data.data ?? response.data.tasks ?? []).map(normalizeTask);
      return {
        data: rows,
        meta: response.data.meta ?? {
          page: filters?.page ?? 1,
          pageSize: filters?.pageSize ?? rows.length,
          total: rows.length,
        },
      } as TasksQueryResult;
    },
    enabled: projectId === undefined || !!projectId,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ["tasks", "detail", id],
    queryFn: async () => {
      const response = await api.get<{ task: Task }>(`/tasks/${id}`);
      return normalizeTask(response.data.task);
    },
    enabled: !!id,
  });
}

export function useUpdateTask(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Task> }) => {
      const response = await api.patch<{ task: Task }>(`/tasks/${id}`, data);
      return normalizeTask(response.data.task);
    },
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({
        queryKey: ["tasks", "detail", updatedTask.task_id],
      });
    },
  });
}

export function useMoveTask(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, sort_order }: { id: string; status: TaskStatus; sort_order: number }) => {
      const response = await api.patch<{ task: Task }>(`/tasks/${id}/move`, { status, sort_order });
      return normalizeTask(response.data.task);
    },
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", updatedTask.task_id] });
    },
  });
}

export function useUpdateTaskLabels(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, label_ids }: { id: string; label_ids: number[] }) => {
      const response = await api.post<{ task: Task }>(`/tasks/${id}/labels`, { label_ids });
      return normalizeTask(response.data.task);
    },
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", updatedTask.task_id] });
    },
  });
}

export function useDeleteTask(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Task>) => {
      const response = await api.post<{ task: Task }>(
        `/projects/${projectId}/tasks`,
        data
      );
      return normalizeTask(response.data.task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useProjectLabels(projectId?: string) {
  return useQuery({
    queryKey: ["labels", projectId],
    queryFn: async () => {
      const response = await api.get<{ labels: Label[] }>(`/projects/${projectId}/labels`);
      return response.data.labels;
    },
    enabled: !!projectId,
  });
}

export function useCreateProjectLabel(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const response = await api.post<{ label: Label }>(`/projects/${projectId}/labels`, data);
      return response.data.label;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", projectId] });
    },
  });
}

export function useUpdateLabel(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name?: string; color?: string } }) => {
      const response = await api.patch<{ label: Label }>(`/labels/${id}`, data);
      return response.data.label;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });
}

export function useDeleteLabel(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/labels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });
}
