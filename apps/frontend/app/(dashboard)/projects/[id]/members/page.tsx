"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUsers } from "@/lib/hooks/useUsers";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Trash2 } from "lucide-react";
import { ProjectMember } from "@/types";

function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: ["members", projectId],
    queryFn: async () => {
      const res = await api.get<{ members: ProjectMember[] }>(
        `/projects/${projectId}/members`
      );
      return res.data.members;
    },
    enabled: !!projectId,
  });
}

export default function MembersPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: members, isLoading } = useProjectMembers(params.id);
  const { data: allUsers } = useUsers();

  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("member");
  const [addError, setAddError] = useState("");

  const isManager = user?.role === "manager" || user?.role === "admin";

  const addMember = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: string }) => {
      await api.post(`/projects/${params.id}/members`, { user_id, role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", params.id] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/projects/${params.id}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", params.id] });
    },
  });

  const existingUserIds = new Set(members?.map((m) => m.user_id) ?? []);
  const availableUsers = (allUsers ?? []).filter(
    (u) => !existingUserIds.has(u.user_id)
  );

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    if (!selectedUserId) {
      setAddError("Please select a user.");
      return;
    }
    try {
      await addMember.mutateAsync({ user_id: selectedUserId, role: selectedRole });
      setOpen(false);
      setSelectedUserId("");
      setSelectedRole("member");
    } catch {
      setAddError("Failed to add member.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading members...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          Members ({members?.length ?? 0})
        </h2>
        {isManager && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        )}
      </div>

      {!members || members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Users className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">No members yet</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Card key={member.user_id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      {member.user
                        ? `${member.user.first_name[0]}${member.user.last_name[0]}`
                        : "?"}
                    </div>
                    <div>
                      <CardTitle className="text-sm">
                        {member.user
                          ? `${member.user.first_name} ${member.user.last_name}`
                          : member.user_id}
                      </CardTitle>
                      {member.user && (
                        <p className="text-xs text-muted-foreground">
                          {member.user.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{member.role}</Badge>
                    {isManager && member.user_id !== user?.user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMember.mutate(member.user_id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Joined {new Date(member.joined_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="space-y-1">
              <Label>User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.first_name} {u.last_name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {addError && <p className="text-sm text-destructive">{addError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addMember.isPending}>
                {addMember.isPending ? "Adding..." : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
