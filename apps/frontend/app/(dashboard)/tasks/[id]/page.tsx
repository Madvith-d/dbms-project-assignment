"use client";

import { useTask } from "@/lib/hooks/useTasks";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  const { data: task, isLoading, error } = useTask(params.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading task...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Failed to load task.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{task.title}</h2>
        <div className="flex gap-2">
          <Badge variant="outline">{task.status.replace("_", " ")}</Badge>
          <Badge variant="secondary">{task.priority}</Badge>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            {task.description && (
              <div>
                <dt className="font-medium text-muted-foreground">Description</dt>
                <dd className="mt-1">{task.description}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium capitalize">
                {task.status.replace("_", " ")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Priority</dt>
              <dd className="font-medium capitalize">{task.priority}</dd>
            </div>
            {task.due_date && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Due Date</dt>
                <dd className="font-medium">
                  {new Date(task.due_date).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
