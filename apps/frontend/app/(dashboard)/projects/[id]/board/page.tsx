"use client";

import { use, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
import { useTasks, useUpdateTask } from "@/lib/hooks/useTasks";
import { useAuth } from "@/lib/hooks/useAuth";
import { Task, TaskStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Calendar, Paperclip } from "lucide-react";
import Link from "next/link";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "in_review", label: "In Review" },
  { status: "done", label: "Done" },
];

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-100 text-red-800 hover:bg-red-100",
  high: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  medium: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  low: "bg-gray-100 text-gray-800 hover:bg-gray-100",
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
    <Draggable draggableId={task.task_id} index={index} isDragDisabled={!canDrag}>
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
            <Badge className={`${PRIORITY_STYLES[task.priority] ?? "bg-gray-100 text-gray-800"} text-xs`}>
              {task.priority}
            </Badge>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {task.due_date && (
                <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : ""}`}>
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

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: tasks, isLoading } = useTasks(id);
  const { user } = useAuth();
  const updateTask = useUpdateTask(id);
  const queryClient = useQueryClient();

  const isManager = user?.role === "manager" || user?.role === "admin";

  const canDragTask = useCallback(
    (task: Task) => isManager || task.assignee_id === user?.user_id,
    [isManager, user?.user_id]
  );

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const { draggableId, destination } = result;
      const newStatus = destination.droppableId as TaskStatus;

      const taskList = tasks ?? [];
      const task = taskList.find((t) => t.task_id === draggableId);
      if (!task || task.status === newStatus) return;
      if (!canDragTask(task)) return;

      // Optimistic update
      queryClient.setQueryData<Task[]>(["tasks", id], (old) =>
        (old ?? []).map((t) =>
          t.task_id === draggableId ? { ...t, status: newStatus } : t
        )
      );

      updateTask.mutate(
        { id: draggableId, data: { status: newStatus } },
        {
          onError: () => {
            // Roll back
            queryClient.setQueryData<Task[]>(["tasks", id], (old) =>
              (old ?? []).map((t) =>
                t.task_id === draggableId ? { ...t, status: task.status } : t
              )
            );
          },
        }
      );
    },
    [tasks, canDragTask, queryClient, id, updateTask]
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
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(({ status, label }) => {
            const columnTasks = (tasks ?? []).filter((t) => t.status === status);
            return (
              <div key={status} className="flex-shrink-0 w-64 space-y-3">
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
