"use client";

import { useQuery } from "@tanstack/react-query";
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
