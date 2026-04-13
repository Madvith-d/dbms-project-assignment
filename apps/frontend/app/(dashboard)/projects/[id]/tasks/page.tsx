"use client";

import { useState } from "react";
import { useTasks } from "@/lib/hooks/useTasks";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { TaskStatus, TaskPriority } from "@/types";

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-blue-100 text-blue-800",
  low: "bg-gray-100 text-gray-800",
};

const STATUS_STYLES: Record<string, string> = {
  backlog: "bg-gray-100 text-gray-700",
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-yellow-100 text-yellow-800",
  in_review: "bg-purple-100 text-purple-800",
  done: "bg-green-100 text-green-800",
};

export default function TasksPage({ params }: { params: { id: string } }) {
  const { data: tasks, isLoading } = useTasks(params.id);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  const filtered = (tasks ?? []).filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Tasks</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-44">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(["backlog", "todo", "in_progress", "in_review", "done"] as TaskStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {(["urgent", "high", "medium", "low"] as TaskPriority[]).map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((task) => {
                const isOverdue =
                  task.due_date &&
                  new Date(task.due_date) < new Date() &&
                  task.status !== "done";
                return (
                  <TableRow key={task.task_id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Link href={`/tasks/${task.task_id}`} className="hover:underline">
                        {task.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_STYLES[task.status] ?? ""}>
                        {task.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={PRIORITY_STYLES[task.priority] ?? ""}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {task.assignee
                        ? `${task.assignee.first_name} ${task.assignee.last_name}`
                        : "—"}
                    </TableCell>
                    <TableCell className={isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}>
                      {task.due_date
                        ? new Date(task.due_date).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No tasks found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
