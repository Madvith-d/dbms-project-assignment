"use client";

import { use, useState } from "react";
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
  urgent: "border border-[#ff6b6b66] bg-[#ff6b6b1f] text-[#ffafaf]",
  high: "border border-[#ffad3366] bg-[#ffad331f] text-[#ffd195]",
  medium: "border border-[#77b5ff66] bg-[#77b5ff1f] text-[#b4d6ff]",
  low: "border border-white/15 bg-white/10 text-slate-200",
};

const STATUS_STYLES: Record<string, string> = {
  backlog: "border border-white/15 bg-white/10 text-slate-200",
  todo: "border border-[#88a3ff55] bg-[#88a3ff1f] text-[#cad7ff]",
  in_progress: "border border-[#ffd56a66] bg-[#ffd56a1f] text-[#ffe4a3]",
  in_review: "border border-[#c27dff55] bg-[#c27dff1f] text-[#e3bcff]",
  done: "border border-[#9CFF4F66] bg-[#9CFF4F1f] text-[#ccff96]",
};

export default function TasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: tasks, isLoading } = useTasks(id);
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
                    <TableCell className={isOverdue ? "font-medium text-[#ff8c8c]" : "text-muted-foreground"}>
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
