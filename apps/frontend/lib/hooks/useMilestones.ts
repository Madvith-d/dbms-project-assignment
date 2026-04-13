"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Milestone } from "@/types";

export function useMilestones(projectId: string) {
  return useQuery({
    queryKey: ["milestones", projectId],
    queryFn: async () => {
      const response = await api.get<{ milestones: Milestone[] }>(
        `/projects/${projectId}/milestones`
      );
      return response.data.milestones;
    },
    enabled: !!projectId,
  });
}

export function useCreateMilestone(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      due_date?: string;
    }) => {
      const response = await api.post<{ milestone: Milestone }>(
        `/projects/${projectId}/milestones`,
        data
      );
      return response.data.milestone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones", projectId] });
    },
  });
}

export function useUpdateMilestone(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Milestone>;
    }) => {
      const response = await api.patch<{ milestone: Milestone }>(
        `/milestones/${id}`,
        data
      );
      return response.data.milestone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones", projectId] });
    },
  });
}

export function useDeleteMilestone(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/milestones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones", projectId] });
    },
  });
}
