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
    admin: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
    manager: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
    member: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100",
  };
  return <Badge className={styles[role]}>{role}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      className={
        status === "active"
          ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100"
          : "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100"
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
