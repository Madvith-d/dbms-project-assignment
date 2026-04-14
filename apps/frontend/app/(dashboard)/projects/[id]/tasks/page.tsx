"use client";

import { use, useMemo, useState } from "react";
import {
  useTasks,
  useCreateTask,
  useDeleteTask,
  useCreateProjectLabel,
  useDeleteLabel,
  useProjectLabels,
  useUpdateTaskLabels,
} from "@/lib/hooks/useTasks";
import { useUserDirectory } from "@/lib/hooks/useUsers";
import { useAuth } from "@/lib/hooks/useAuth";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
import { Plus, Trash2, Tags } from "lucide-react";
import { Task, TaskStatus, TaskPriority } from "@/types";

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

interface TaskForm {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
}

const EMPTY_FORM: TaskForm = {
  title: "",
  description: "",
  priority: "medium",
  status: "backlog",
  due_date: "",
};

function LabelsCell({ task, projectId }: { task: Task; projectId: string }) {
  const { user } = useAuth();
  const { data: labels } = useProjectLabels(projectId);
  const updateTaskLabels = useUpdateTaskLabels(projectId);
  const [open, setOpen] = useState(false);

  const isManager = user?.role === "manager" || user?.role === "admin";
  const selected = (task.labels ?? []).map((l) => l.label_id);

  async function toggleLabel(labelId: number, checked: boolean) {
    const next = checked
      ? Array.from(new Set([...selected, labelId]))
      : selected.filter((id) => id !== labelId);
    await updateTaskLabels.mutateAsync({ id: String(task.task_id), label_ids: next });
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-wrap gap-1">
        {(task.labels ?? []).map((label) => (
          <Badge
            key={label.label_id}
            className="text-xs border"
            style={{ backgroundColor: `${label.color}22`, borderColor: `${label.color}66`, color: label.color }}
          >
            {label.name}
          </Badge>
        ))}
      </div>
      {isManager && (
        <>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setOpen(true)}>
            <Tags className="h-3.5 w-3.5" />
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Labels for {task.title}</DialogTitle></DialogHeader>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(labels ?? []).map((label) => {
                  const checked = selected.includes(label.label_id);
                  return (
                    <label key={label.label_id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleLabel(label.label_id, e.target.checked)}
                      />
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      {label.name}
                    </label>
                  );
                })}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

export default function TasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data: users } = useUserDirectory();
  const { data: labels } = useProjectLabels(id);
  const createTask = useCreateTask(id);
  const deleteTask = useDeleteTask(id);

  const createLabel = useCreateProjectLabel(id);
  const deleteLabel = useDeleteLabel(id);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [labelFilter, setLabelFilter] = useState<string>("all");
  const [dueAfter, setDueAfter] = useState("");
  const [dueBefore, setDueBefore] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("#6366f1");

  const isManager = user?.role === "manager" || user?.role === "admin";

  const filters = useMemo(() => ({
    q: q.trim() || undefined,
    status: statusFilter === "all" ? undefined : (statusFilter as TaskStatus),
    priority: priorityFilter === "all" ? undefined : (priorityFilter as TaskPriority),
    assigned_to: assigneeFilter === "all" ? undefined : assigneeFilter,
    label_id: labelFilter === "all" ? undefined : labelFilter,
    due_after: dueAfter || undefined,
    due_before: dueBefore || undefined,
    page,
    pageSize,
  }), [q, statusFilter, priorityFilter, assigneeFilter, labelFilter, dueAfter, dueBefore, page]);

  const { data: taskResult, isLoading } = useTasks(id, filters);
  const tasks = taskResult?.data ?? [];
  const meta = taskResult?.meta;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    try {
      await createTask.mutateAsync({
        title: form.title.trim(),
        description: form.description || undefined,
        priority: form.priority,
        status: form.status,
        due_date: form.due_date || undefined,
      });
      setOpen(false);
      setForm(EMPTY_FORM);
    } catch {
      setFormError("Failed to create task.");
    }
  }

  async function handleCreateLabel() {
    if (!labelName.trim()) return;
    await createLabel.mutateAsync({ name: labelName.trim(), color: labelColor });
    setLabelName("");
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Tasks</h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
        <Input placeholder="Search title or description" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(["backlog", "todo", "in_progress", "in_review", "done"] as TaskStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="All priorities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {(["urgent", "high", "medium", "low"] as TaskPriority[]).map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={(v) => { setAssigneeFilter(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Assignee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            {(users ?? []).map((u) => (
              <SelectItem key={u.user_id} value={String(u.user_id)}>{u.first_name} {u.last_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={labelFilter} onValueChange={(v) => { setLabelFilter(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Label" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All labels</SelectItem>
            {(labels ?? []).map((l) => (
              <SelectItem key={l.label_id} value={String(l.label_id)}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={dueAfter} onChange={(e) => { setDueAfter(e.target.value); setPage(1); }} />
        <Input type="date" value={dueBefore} onChange={(e) => { setDueBefore(e.target.value); setPage(1); }} />
      </div>

      {isManager && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Label management</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
                placeholder="Label name"
                className="w-52"
              />
              <Input
                type="color"
                value={labelColor}
                onChange={(e) => setLabelColor(e.target.value)}
                className="w-16 p-1"
              />
              <Button size="sm" onClick={handleCreateLabel} disabled={createLabel.isPending || !labelName.trim()}>
                Add label
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(labels ?? []).map((label) => (
                <div key={label.label_id} className="flex items-center gap-1 rounded border px-2 py-1">
                  <Badge className="text-xs border" style={{ backgroundColor: `${label.color}22`, borderColor: `${label.color}66`, color: label.color }}>
                    {label.name}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteLabel.mutate(label.label_id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tasks ({meta?.total ?? tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Labels</TableHead>
                <TableHead>Due Date</TableHead>
                {isManager && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
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
                    <TableCell>
                      <LabelsCell task={task} projectId={id} />
                    </TableCell>
                    <TableCell className={isOverdue ? "font-medium text-[#ff8c8c]" : "text-muted-foreground"}>
                      {task.due_date
                        ? new Date(task.due_date).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    {isManager && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.preventDefault();
                            deleteTask.mutate(String(task.task_id));
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {tasks.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isManager ? 7 : 6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No tasks found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {meta?.page ?? page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="task-title">Title *</Label>
              <Input
                id="task-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Task title"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea
                id="task-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Optional description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as TaskStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["backlog", "todo", "in_progress", "in_review", "done"] as TaskStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v as TaskPriority }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["urgent", "high", "medium", "low"] as TaskPriority[]).map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="task-due">Due Date</Label>
              <Input
                id="task-due"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setForm(EMPTY_FORM); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
