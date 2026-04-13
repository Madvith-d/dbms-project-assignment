"use client";

import { useState } from "react";
import { useProjects, useCreateProject } from "@/lib/hooks/useProjects";
import { useAuth } from "@/lib/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
import { FolderKanban, Plus, Calendar, Users } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  planning: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  active: "bg-green-100 text-green-800 hover:bg-green-100",
  on_hold: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  completed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
  archived: "bg-gray-100 text-gray-800 hover:bg-gray-100",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_STYLES[status] ?? "bg-gray-100 text-gray-800"}>
      {status.replace("_", " ")}
    </Badge>
  );
}

export default function ProjectsPage() {
  const { data: projects, isLoading, error } = useProjects();
  const { user } = useAuth();
  const createProject = useCreateProject();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    project_name: "",
    description: "",
    start_date: "",
    end_date: "",
    budget: "",
  });
  const [formError, setFormError] = useState("");

  const isManager = user?.role === "manager" || user?.role === "admin";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.project_name.trim()) {
      setFormError("Project name is required.");
      return;
    }
    try {
      await createProject.mutateAsync({
        project_name: form.project_name.trim(),
        description: form.description || undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
      });
      setOpen(false);
      setForm({ project_name: "", description: "", start_date: "", end_date: "", budget: "" });
    } catch {
      setFormError("Failed to create project.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Failed to load projects.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">All your projects in one place</p>
        </div>
        {isManager && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      {!projects || projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">No projects yet</p>
          <p className="text-sm text-muted-foreground">
            Projects you have access to will appear here
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.project_id} href={`/projects/${project.project_id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md h-full">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{project.project_name}</CardTitle>
                    <StatusBadge status={project.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
                    {project.end_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due {new Date(project.end_date).toLocaleDateString()}
                      </span>
                    )}
                    {project.member_count !== undefined && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {project.member_count} member{project.member_count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="project_name">Project Name *</Label>
              <Input
                id="project_name"
                value={form.project_name}
                onChange={(e) => setForm((f) => ({ ...f, project_name: e.target.value }))}
                placeholder="My awesome project"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Project description..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="budget">Budget ($)</Label>
              <Input
                id="budget"
                type="number"
                min="0"
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                placeholder="0"
              />
            </div>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProject.isPending}>
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
