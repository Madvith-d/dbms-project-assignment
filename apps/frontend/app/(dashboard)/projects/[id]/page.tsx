"use client";

import { useProject } from "@/lib/hooks/useProjects";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ClipboardList, Milestone, Users, Kanban } from "lucide-react";

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: project, isLoading, error } = useProject(params.id);

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

  const links = [
    { label: "Board", href: `/projects/${params.id}/board`, icon: Kanban },
    { label: "Tasks", href: `/projects/${params.id}/tasks`, icon: ClipboardList },
    {
      label: "Milestones",
      href: `/projects/${params.id}/milestones`,
      icon: Milestone,
    },
    { label: "Members", href: `/projects/${params.id}/members`, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{project.name}</h2>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
        <Badge>{project.status}</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {links.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View {label.toLowerCase()}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
