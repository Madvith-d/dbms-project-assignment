"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useProject, useUpdateProject, useDeleteProject } from "@/lib/hooks/useProjects";
import { useMilestones } from "@/lib/hooks/useMilestones";
import { useTasks } from "@/lib/hooks/useTasks";
import { useAuth } from "@/lib/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { ClipboardList, Milestone, Users, Kanban, Calendar, DollarSign, Pencil, Trash2 } from "lucide-react";
import { ProjectStatus } from "@/types";

const STATUS_STYLES: Record<string, string> = {
  planning: "border border-[#c27dff55] bg-[#c27dff1f] text-[#e3bcff]",
  active: "border border-[#9CFF4F66] bg-[#9CFF4F1f] text-[#ccff96]",
  on_hold: "border border-[#ffd56a66] bg-[#ffd56a1f] text-[#ffe4a3]",
  completed: "border border-[#77b5ff66] bg-[#77b5ff1f] text-[#b4d6ff]",
  cancelled: "border border-[#ff6b6b66] bg-[#ff6b6b1f] text-[#ffafaf]",
  archived: "border border-white/15 bg-white/10 text-slate-200",
};

interface ProjectEditForm {
  project_name: string;
  description: string;
  start_date: string;
  end_date: string;
  budget: string;
  status: ProjectStatus;
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { data: project, isLoading, error } = useProject(id);
  const { data: milestones } = useMilestones(id);
  const { data: tasks } = useTasks(id);
  const updateProject = useUpdateProject(id);
  const deleteProject = useDeleteProject();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editForm, setEditForm] = useState<ProjectEditForm | null>(null);
  const [editError, setEditError] = useState("");

  const isManager = user?.role === "manager" || user?.role === "admin";

  function openEdit() {
    if (!project) return;
    setEditForm({
      project_name: project.project_name,
      description: project.description ?? "",
      start_date: project.start_date ? new Date(project.start_date).toISOString().split("T")[0] : "",
      end_date: project.end_date ? new Date(project.end_date).toISOString().split("T")[0] : "",
      budget: project.budget != null ? String(project.budget) : "",
      status: project.status as ProjectStatus,
    });
    setEditError("");
    setEditOpen(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm) return;
    setEditError("");
    if (!editForm.project_name.trim()) {
      setEditError("Project name is required.");
      return;
    }
    try {
      await updateProject.mutateAsync({
        project_name: editForm.project_name.trim(),
        description: editForm.description || undefined,
        start_date: editForm.start_date || undefined,
        end_date: editForm.end_date || undefined,
        budget: editForm.budget ? Number(editForm.budget) : undefined,
        status: editForm.status,
      });
      setEditOpen(false);
    } catch {
      setEditError("Failed to update project.");
    }
  }

  async function handleDelete() {
    try {
      await deleteProject.mutateAsync(id);
      router.push("/projects");
    } catch {
      setDeleteConfirmOpen(false);
    }
  }

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
        <div className="flex items-center gap-2">
          <Badge className={STATUS_STYLES[project.status] ?? "border border-white/15 bg-white/10 text-slate-200"}>
            {project.status.replace("_", " ")}
          </Badge>
          {isManager && (
            <>
              <Button variant="outline" size="sm" onClick={openEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            </>
          )}
        </div>
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

      {/* Edit Dialog */}
      {editForm && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="edit-name">Project Name *</Label>
                <Input
                  id="edit-name"
                  value={editForm.project_name}
                  onChange={(e) => setEditForm((f) => f ? { ...f, project_name: e.target.value } : f)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-desc">Description</Label>
                <Textarea
                  id="edit-desc"
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => f ? { ...f, description: e.target.value } : f)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-start">Start Date</Label>
                  <Input
                    id="edit-start"
                    type="date"
                    value={editForm.start_date}
                    onChange={(e) => setEditForm((f) => f ? { ...f, start_date: e.target.value } : f)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-end">End Date</Label>
                  <Input
                    id="edit-end"
                    type="date"
                    value={editForm.end_date}
                    onChange={(e) => setEditForm((f) => f ? { ...f, end_date: e.target.value } : f)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-budget">Budget ($)</Label>
                  <Input
                    id="edit-budget"
                    type="number"
                    min="0"
                    value={editForm.budget}
                    onChange={(e) => setEditForm((f) => f ? { ...f, budget: e.target.value } : f)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(v) => setEditForm((f) => f ? { ...f, status: v as ProjectStatus } : f)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["planning", "active", "on_hold", "completed", "cancelled", "archived"] as ProjectStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {editError && <p className="text-sm text-destructive">{editError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProject.isPending}>
                  {updateProject.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{project.project_name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteProject.isPending}>
              {deleteProject.isPending ? "Deleting..." : "Delete Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
