"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUsers, useUpdateUserRole, useUpdateUserStatus } from "@/lib/hooks/useUsers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { User, UserRole } from "@/types";

function RoleBadge({ role }: { role: UserRole }) {
  const styles = {
    admin: "border border-[#ff6b6b66] bg-[#ff6b6b1f] text-[#ffafaf] hover:bg-[#ff6b6b2b]",
    manager: "border border-[#77b5ff66] bg-[#77b5ff1f] text-[#b4d6ff] hover:bg-[#77b5ff2b]",
    member: "border border-white/15 bg-white/10 text-slate-200 hover:bg-white/15",
  };
  return <Badge className={styles[role]}>{role}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      className={
        status === "active"
          ? "border border-[#9CFF4F66] bg-[#9CFF4F1f] text-[#ccff96] hover:bg-[#9CFF4F2b]"
          : "border border-[#ffd56a66] bg-[#ffd56a1f] text-[#ffe4a3] hover:bg-[#ffd56a2b]"
      }
    >
      {status}
    </Badge>
  );
}

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { data: users, isLoading, error } = useUsers();
  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateUserStatus();

  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      router.push("/");
    }
  }, [currentUser, router]);

  const handleRoleChange = (user: User) => {
    const newRole: UserRole = user.role === "manager" ? "member" : "manager";
    updateRole.mutate({ id: user.user_id, role: newRole });
  };

  const handleStatusToggle = (user: User) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    updateStatus.mutate({ id: user.user_id, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Failed to load users. You may not have permission.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground">
          Manage user roles and account statuses
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {users?.length ?? 0} total users registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">
                    {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={user.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.role !== "admin" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRoleChange(user)}
                          disabled={
                            updateRole.isPending &&
                            updateRole.variables?.id === user.user_id
                          }
                        >
                          {user.role === "manager"
                            ? "Demote to Member"
                            : "Promote to Manager"}
                        </Button>
                      )}
                      {user.user_id !== currentUser?.user_id && (
                        <Button
                          size="sm"
                          variant={
                            user.status === "active" ? "destructive" : "default"
                          }
                          onClick={() => handleStatusToggle(user)}
                          disabled={
                            updateStatus.isPending &&
                            updateStatus.variables?.id === user.user_id
                          }
                        >
                          {user.status === "active" ? "Deactivate" : "Activate"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
