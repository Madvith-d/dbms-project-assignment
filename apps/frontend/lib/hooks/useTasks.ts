"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Task } from "@/types";

export function useTasks(projectId?: string) {
  return useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const url = projectId ? `/projects/${projectId}/tasks` : "/tasks";
      const response = await api.get<{ tasks: Task[] }>(url);
      return response.data.tasks;
    },
    enabled: projectId === undefined || !!projectId,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ["tasks", "detail", id],
    queryFn: async () => {
      const response = await api.get<{ task: Task }>(`/tasks/${id}`);
      return response.data.task;
    },
    enabled: !!id,
  });
}

export function useUpdateTask(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Task> }) => {
      const response = await api.patch<{ task: Task }>(`/tasks/${id}`, data);
      return response.data.task;
    },
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({
        queryKey: ["tasks", "detail", updatedTask.task_id],
      });
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
      return response.data.task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });
}
