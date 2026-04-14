"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/useAuth";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

interface DirectoryUser {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

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

function useProjectRoles(projectId: string) {
  return useQuery({
    queryKey: ["project-roles", projectId],
    queryFn: async () => {
      const res = await api.get<{ roles: string[] }>(`/projects/${projectId}/roles`);
      return res.data.roles;
    },
    enabled: !!projectId,
  });
}

function useUserDirectory() {
  return useQuery({
    queryKey: ["users", "directory"],
    queryFn: async () => {
      const res = await api.get<{ users: DirectoryUser[] }>("/users/directory");
      return res.data.users;
    },
  });
}

export default function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: members, isLoading } = useProjectMembers(id);
  const { data: directoryUsers } = useUserDirectory();
  const { data: projectRoles } = useProjectRoles(id);

  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("member");
  const [customRole, setCustomRole] = useState("");
  const [addError, setAddError] = useState("");

  const isManager = user?.role === "manager";
  const roleOptions = Array.from(new Set([...(projectRoles ?? []), "member"]));

  const addMember = useMutation({
    mutationFn: async ({
      user_id,
      assigned_role,
    }: {
      user_id: number;
      assigned_role: string;
    }) => {
      await api.post(`/projects/${id}/members`, { user_id, assigned_role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", id] });
      queryClient.invalidateQueries({ queryKey: ["project-roles", id] });
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({
      user_id,
      assigned_role,
    }: {
      user_id: number;
      assigned_role: string;
    }) => {
      await api.patch(`/projects/${id}/members/${user_id}/role`, { assigned_role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", id] });
      queryClient.invalidateQueries({ queryKey: ["project-roles", id] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (userId: number) => {
      await api.delete(`/projects/${id}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", id] });
    },
  });

  const existingUserIds = new Set(
    (members ?? []).map((m) => Number(m.user?.user_id))
  );
  const availableUsers = (directoryUsers ?? []).filter(
    (u) => !existingUserIds.has(u.user_id)
  );

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    if (!selectedUserId) {
      setAddError("Please select a user.");
      return;
    }
    const roleToAssign =
      selectedRole === "__custom__" ? customRole.trim() : selectedRole.trim();
    if (!roleToAssign) {
      setAddError("Please provide a role.");
      return;
    }
    try {
      await addMember.mutateAsync({
        user_id: Number(selectedUserId),
        assigned_role: roleToAssign,
      });
      setOpen(false);
      setSelectedUserId("");
      setSelectedRole("member");
      setCustomRole("");
    } catch {
      setAddError("Failed to add member.");
    }
  }

  async function handleMemberRoleChange(memberUserId: number, nextRole: string) {
    const roleToAssign =
      nextRole === "__custom__"
        ? window.prompt("Enter a custom role for this member:", "")?.trim() ?? ""
        : nextRole.trim();

    if (!roleToAssign) return;

    try {
      await updateMemberRole.mutateAsync({
        user_id: memberUserId,
        assigned_role: roleToAssign,
      });
    } catch {
      // Keep current role display untouched; query refresh on success only.
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
          {members.map((member) => {
            const memberId = member.user?.user_id;
            const memberRoleOptions = Array.from(new Set([...roleOptions, member.assigned_role]));
            return (
              <Card key={member.project_member_id}>
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
                            : "Unknown"}
                        </CardTitle>
                        {member.user && (
                          <p className="text-xs text-muted-foreground">
                            {member.user.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isManager && memberId ? (
                        <Select
                          value={member.assigned_role}
                          onValueChange={(value) => handleMemberRoleChange(Number(memberId), value)}
                        >
                          <SelectTrigger className="h-8 w-[140px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {memberRoleOptions.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                            <SelectItem value="__custom__">Custom role...</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {member.assigned_role}
                        </Badge>
                      )}
                      {isManager && memberId && memberId !== user?.user_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeMember.mutate(Number(memberId))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Joined{" "}
                    {member.joined_date
                      ? new Date(member.joined_date).toLocaleDateString()
                      : "—"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
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
                    <SelectItem key={u.user_id} value={String(u.user_id)}>
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
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">Custom role...</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedRole === "__custom__" && (
              <div className="space-y-1">
                <Label>Custom Role</Label>
                <Input
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="e.g. frontend dev, qa tester"
                />
              </div>
            )}
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
