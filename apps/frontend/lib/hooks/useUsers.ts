"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { User, UserRole, UserStatus } from "@/types";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await api.get<{ users: User[] }>("/users");
      return response.data.users;
    },
  });
}

export function useUserDirectory() {
  return useQuery({
    queryKey: ["users", "directory"],
    queryFn: async () => {
      const response = await api.get<{ users: User[] }>("/users/directory");
      return response.data.users;
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const response = await api.patch<{ user: User }>(`/users/${id}/role`, {
        role,
      });
      return response.data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: UserStatus }) => {
      const response = await api.patch<{ user: User }>(
        `/users/${id}/status`,
        { status }
      );
      return response.data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
