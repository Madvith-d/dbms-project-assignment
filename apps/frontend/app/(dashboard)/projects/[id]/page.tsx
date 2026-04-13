"use client";

import { use } from "react";
import { useProject } from "@/lib/hooks/useProjects";
import { useMilestones } from "@/lib/hooks/useMilestones";
import { useTasks } from "@/lib/hooks/useTasks";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ClipboardList, Milestone, Users, Kanban, Calendar, DollarSign } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  planning: "bg-purple-100 text-purple-800",
  active: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  archived: "bg-gray-100 text-gray-800",
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: project, isLoading, error } = useProject(id);
  const { data: milestones } = useMilestones(id);
  const { data: tasks } = useTasks(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Failed to load project.
      </div>
    );
  }

  const memberCount = project.member_count ?? project.members?.length ?? 0;
  const recentTasks = tasks?.slice(0, 5) ?? [];

  const navLinks = [
    { label: "Board", href: `/projects/${id}/board`, icon: Kanban, count: null },
    { label: "Tasks", href: `/projects/${id}/tasks`, icon: ClipboardList, count: tasks?.length ?? null },
    { label: "Milestones", href: `/projects/${id}/milestones`, icon: Milestone, count: milestones?.length ?? null },
    { label: "Members", href: `/projects/${id}/members`, icon: Users, count: memberCount || null },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{project.project_name}</h2>
          {project.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        <Badge className={STATUS_STYLES[project.status] ?? "bg-gray-100 text-gray-800"}>
          {project.status.replace("_", " ")}
        </Badge>
      </div>

      {/* Project metadata */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {project.start_date && (
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Started {new Date(project.start_date).toLocaleDateString()}
          </span>
        )}
        {project.end_date && (
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Deadline {new Date(project.end_date).toLocaleDateString()}
          </span>
        )}
        {project.budget !== undefined && project.budget !== null && (
          <span className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            Budget: ${project.budget.toLocaleString()}
          </span>
        )}
        {memberCount > 0 && (
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {memberCount} member{memberCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Navigation cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {navLinks.map(({ label, href, icon: Icon, count }) => (
          <Link key={href} href={href}>
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {count !== null ? `${count} ${label.toLowerCase()}` : `View ${label.toLowerCase()}`}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent tasks */}
      {recentTasks.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent Tasks</CardTitle>
            <Link href={`/projects/${id}/tasks`} className="text-xs text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentTasks.map((task) => (
              <Link key={task.task_id} href={`/tasks/${task.task_id}`}>
                <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted">
                  <span className="text-sm font-medium">{task.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {task.status.replace("_", " ")}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
