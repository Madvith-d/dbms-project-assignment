"use client";

import { useMilestones } from "@/lib/hooks/useMilestones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Milestone } from "lucide-react";

export default function MilestonesPage({ params }: { params: { id: string } }) {
  const { data: milestones, isLoading } = useMilestones(params.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading milestones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Milestones</h2>
      {!milestones || milestones.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Milestone className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">No milestones yet</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {milestones.map((milestone) => (
            <Card key={milestone.milestone_id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="text-base">{milestone.title}</CardTitle>
                <Badge variant="outline">{milestone.status}</Badge>
              </CardHeader>
              <CardContent>
                {milestone.description && (
                  <p className="text-sm text-muted-foreground">
                    {milestone.description}
                  </p>
                )}
                {milestone.due_date && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Due: {new Date(milestone.due_date).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
