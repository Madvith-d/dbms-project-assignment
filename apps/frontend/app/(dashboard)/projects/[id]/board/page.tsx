"use client";

import { use, useCallback, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
import { useMoveTask, useProjectLabels, useTasks } from "@/lib/hooks/useTasks";
import { useUserDirectory } from "@/lib/hooks/useUsers";
import { useAuth } from "@/lib/hooks/useAuth";
import { Task, TaskStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Calendar, Paperclip } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "in_review", label: "In Review" },
  { status: "done", label: "Done" },
];

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "border border-[#ff6b6b66] bg-[#ff6b6b1f] text-[#ffafaf] hover:bg-[#ff6b6b2b]",
  high: "border border-[#ffad3366] bg-[#ffad331f] text-[#ffd195] hover:bg-[#ffad332b]",
  medium: "border border-[#77b5ff66] bg-[#77b5ff1f] text-[#b4d6ff] hover:bg-[#77b5ff2b]",
  low: "border border-white/15 bg-white/10 text-slate-200 hover:bg-white/15",
};

function getInitials(task: Task) {
  if (!task.assignee) return null;
  return `${task.assignee.first_name[0]}${task.assignee.last_name[0]}`;
}

function TaskCard({ task, index, canDrag }: { task: Task; index: number; canDrag: boolean }) {
  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== "done";

  const subtaskTotal = task.subtask_count ?? 0;
  const subtaskDone = task.completed_subtask_count ?? 0;

  return (
    <Draggable draggableId={String(task.task_id)} index={index} isDragDisabled={!canDrag}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`rounded-md border bg-background p-3 shadow-sm transition-shadow ${
            snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30" : ""
          } ${canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
        >
          <Link href={`/tasks/${task.task_id}`} onClick={(e) => snapshot.isDragging && e.preventDefault()}>
            <p className="text-sm font-medium hover:underline line-clamp-2">{task.title}</p>
          </Link>

          <div className="mt-2 flex flex-wrap gap-1.5 items-center">
            <Badge className={`${PRIORITY_STYLES[task.priority] ?? "border border-white/15 bg-white/10 text-slate-200"} text-xs`}>
              {task.priority}
            </Badge>
            {(task.labels ?? []).slice(0, 2).map((label) => (
              <Badge
                key={label.label_id}
                className="text-xs border"
                style={{ backgroundColor: `${label.color}22`, borderColor: `${label.color}66`, color: label.color }}
              >
                {label.name}
              </Badge>
            ))}
            {(task.labels?.length ?? 0) > 2 && (
              <Badge variant="outline" className="text-xs">+{(task.labels?.length ?? 0) - 2}</Badge>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {task.due_date && (
                <span className={`flex items-center gap-1 ${isOverdue ? "font-medium text-[#ff8c8c]" : ""}`}>
                  <Calendar className="h-3 w-3" />
                  {new Date(task.due_date).toLocaleDateString()}
                </span>
              )}
              {(task.attachment_count ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  {task.attachment_count}
                </span>
              )}
              {subtaskTotal > 0 && (
                <span>{subtaskDone}/{subtaskTotal}</span>
              )}
            </div>
            {getInitials(task) && (
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                {getInitials(task)}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

function getColumnTasks(tasks: Task[], status: TaskStatus, excludingTaskId?: string) {
  return tasks
    .filter((t) => t.status === status && String(t.task_id) !== excludingTaskId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function getSortOrderForDestination(
  tasks: Task[],
  status: TaskStatus,
  destinationIndex: number,
  movingTaskId: string
) {
  const columnTasks = getColumnTasks(tasks, status, movingTaskId);
  const before = columnTasks[destinationIndex - 1];
  const after = columnTasks[destinationIndex];

  if (!before && !after) return 1;
  if (!before) return (after?.sort_order ?? 0) - 1;
  if (!after) return (before.sort_order ?? 0) + 1;

  return ((before.sort_order ?? 0) + (after.sort_order ?? 0)) / 2;
}

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data: users } = useUserDirectory();
  const { data: labels } = useProjectLabels(id);

  const [q, setQ] = useState("");
  const [priority, setPriority] = useState<string>("all");
  const [assignedTo, setAssignedTo] = useState<string>("all");
  const [labelId, setLabelId] = useState<string>("all");

  const filters = useMemo(
    () => ({
      q: q.trim() || undefined,
      priority: priority === "all" ? undefined : (priority as "low" | "medium" | "high" | "urgent"),
      assigned_to: assignedTo === "all" ? undefined : assignedTo,
      label_id: labelId === "all" ? undefined : labelId,
      page: 1,
      pageSize: 500,
    }),
    [assignedTo, labelId, priority, q]
  );

  const { data: taskResult, isLoading } = useTasks(id, filters);
  const tasks = taskResult?.data ?? [];

  const moveTask = useMoveTask(id);
  const queryClient = useQueryClient();

  const isManager = user?.role === "manager" || user?.role === "admin";

  const canDragTask = useCallback(
    (task: Task) => isManager || task.assignee_id === user?.user_id,
    [isManager, user?.user_id]
  );

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const { draggableId, destination, source } = result;
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;

      const task = tasks.find((t) => String(t.task_id) === draggableId);
      if (!task || !canDragTask(task)) return;

      const nextStatus = destination.droppableId as TaskStatus;
      const nextSortOrder = getSortOrderForDestination(tasks, nextStatus, destination.index, draggableId);
      const prevStatus = task.status;
      const prevSortOrder = task.sort_order ?? 0;

      queryClient.setQueryData(["tasks", id, filters], (old: { data: Task[]; meta: any } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((t) =>
            String(t.task_id) === draggableId
              ? { ...t, status: nextStatus, sort_order: nextSortOrder }
              : t
          ),
        };
      });

      moveTask.mutate(
        { id: draggableId, status: nextStatus, sort_order: nextSortOrder },
        {
          onError: () => {
            queryClient.setQueryData(["tasks", id, filters], (old: { data: Task[]; meta: any } | undefined) => {
              if (!old) return old;
              return {
                ...old,
                data: old.data.map((t) =>
                  String(t.task_id) === draggableId
                    ? { ...t, status: prevStatus, sort_order: prevSortOrder }
                    : t
                ),
              };
            });
          },
        }
      );
    },
    [canDragTask, filters, id, moveTask, queryClient, tasks]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading board...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Board</h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Search tasks..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="urgent">urgent</SelectItem>
            <SelectItem value="high">high</SelectItem>
            <SelectItem value="medium">medium</SelectItem>
            <SelectItem value="low">low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={assignedTo} onValueChange={setAssignedTo}>
          <SelectTrigger><SelectValue placeholder="Assignee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            {(users ?? []).map((u) => (
              <SelectItem key={u.user_id} value={String(u.user_id)}>
                {u.first_name} {u.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={labelId} onValueChange={setLabelId}>
          <SelectTrigger><SelectValue placeholder="Label" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All labels</SelectItem>
            {(labels ?? []).map((label) => (
              <SelectItem key={label.label_id} value={String(label.label_id)}>
                {label.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(({ status, label }) => {
            const columnTasks = getColumnTasks(tasks, status);
            return (
              <div key={status} className="flex-shrink-0 w-72 space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-sm font-semibold">{label}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {columnTasks.length}
                  </span>
                </div>
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[200px] rounded-lg border-2 p-2 space-y-2 transition-colors ${
                        snapshot.isDraggingOver
                          ? "border-primary/40 bg-primary/5"
                          : "border-dashed border-muted-foreground/20 bg-muted/30"
                      }`}
                    >
                      {columnTasks.map((task, index) => (
                        <TaskCard
                          key={task.task_id}
                          task={task}
                          index={index}
                          canDrag={canDragTask(task)}
                        />
                      ))}
                      {provided.placeholder}
                      {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                        <p className="py-4 text-center text-xs text-muted-foreground">
                          No tasks
                        </p>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
