"use client";

import { useTasks } from "@/lib/hooks/useTasks";
import { Task, TaskStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "in_review", label: "In Review" },
  { status: "done", label: "Done" },
];

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    critical: "bg-red-100 text-red-800 hover:bg-red-100",
    high: "bg-orange-100 text-orange-800 hover:bg-orange-100",
    medium: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    low: "bg-green-100 text-green-800 hover:bg-green-100",
  };
  return (
    <Badge className={styles[priority] ?? "bg-gray-100 text-gray-800"}>
      {priority}
    </Badge>
  );
}

function TaskCard({ task }: { task: Task }) {
  return (
    <div className="rounded-md border bg-background p-3 shadow-sm">
      <p className="text-sm font-medium">{task.title}</p>
      {task.description && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
          {task.description}
        </p>
      )}
      <div className="mt-2">
        <PriorityBadge priority={task.priority} />
      </div>
    </div>
  );
}

export default function BoardPage({ params }: { params: { id: string } }) {
  const { data: tasks, isLoading } = useTasks(params.id);

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
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map(({ status, label }) => {
          const columnTasks =
            tasks?.filter((t) => t.status === status) ?? [];
          return (
            <div key={status} className="space-y-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {label}
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
                      {columnTasks.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {columnTasks.map((task) => (
                    <TaskCard key={task.task_id} task={task} />
                  ))}
                  {columnTasks.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      No tasks
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
