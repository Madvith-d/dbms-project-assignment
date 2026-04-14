"use client";

import { use, useState } from "react";
import { useProjectActivity } from "@/lib/hooks/useProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProjectActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data, isLoading } = useProjectActivity(id, page, pageSize);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading activity...</p>
      </div>
    );
  }

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Activity</h2>
      <Card>
        <CardHeader>
          <CardTitle>Project timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data?.data ?? []).map((log) => (
            <div key={log.activity_id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{log.summary}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {log.actor ? `${log.actor.first_name} ${log.actor.last_name}` : `User ${log.actor_user_id}`} · {log.entity_type} · {log.action}
              </p>
            </div>
          ))}

          {(data?.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {data?.meta.page ?? page} of {totalPages}
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
    </div>
  );
}
