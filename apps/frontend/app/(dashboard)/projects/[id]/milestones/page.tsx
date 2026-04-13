"use client";

import { use, useState } from "react";import {
  useMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
} from "@/lib/hooks/useMilestones";
import { useAuth } from "@/lib/hooks/useAuth";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Milestone as MilestoneIcon, Plus, Pencil, Trash2 } from "lucide-react";
import { Milestone, MilestoneStatus } from "@/types";

const STATUS_STYLES: Record<MilestoneStatus, string> = {
  upcoming: "border border-[#77b5ff66] bg-[#77b5ff1f] text-[#b4d6ff]",
  in_progress: "border border-[#ffd56a66] bg-[#ffd56a1f] text-[#ffe4a3]",
  completed: "border border-[#9CFF4F66] bg-[#9CFF4F1f] text-[#ccff96]",
  missed: "border border-[#ff6b6b66] bg-[#ff6b6b1f] text-[#ffafaf]",
};

function isOverdue(m: Milestone) {
  return (
    m.status !== "completed" &&
    m.due_date != null &&
    new Date(m.due_date) < new Date()
  );
}

interface MilestoneFormState {
  title: string;
  description: string;
  due_date: string;
  status: MilestoneStatus;
}

const EMPTY_FORM: MilestoneFormState = {
  title: "",
  description: "",
  due_date: "",
  status: "upcoming",
};

export default function MilestonesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data: milestones, isLoading } = useMilestones(id);
  const createMilestone = useCreateMilestone(id);
  const updateMilestone = useUpdateMilestone(id);
  const deleteMilestone = useDeleteMilestone(id);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Milestone | null>(null);
  const [form, setForm] = useState<MilestoneFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const isManager = user?.role === "manager" || user?.role === "admin";

  const sorted = [...(milestones ?? [])].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError("");
    setCreateOpen(true);
  }

  function openEdit(m: Milestone) {
    setForm({
      title: m.title,
      description: m.description ?? "",
      due_date: m.due_date ? m.due_date.split("T")[0] : "",
      status: m.status,
    });
    setFormError("");
    setEditTarget(m);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    try {
      await createMilestone.mutateAsync({
        title: form.title.trim(),
        description: form.description || undefined,
        due_date: form.due_date || undefined,
      });
      setCreateOpen(false);
    } catch {
      setFormError("Failed to create milestone.");
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setFormError("");
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    try {
      await updateMilestone.mutateAsync({
        id: editTarget.milestone_id,
        data: {
          title: form.title.trim(),
          description: form.description || undefined,
          due_date: form.due_date || undefined,
          status: form.status,
        },
      });
      setEditTarget(null);
    } catch {
      setFormError("Failed to update milestone.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading milestones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Milestones</h2>
        {isManager && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Milestone
          </Button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <MilestoneIcon className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">No milestones yet</p>
        </div>
      ) : (
        /* Timeline */
        <div className="relative pl-6">
          {/* Vertical line */}
          <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {sorted.map((m) => {
              const overdue = isOverdue(m);
              return (
                <div key={m.milestone_id} className="relative">
                  {/* Timeline node */}
                  <div
                    className={`absolute -left-4 top-1.5 h-3 w-3 rounded-full border-2 border-background ${
                      m.status === "completed"
                        ? "bg-green-500"
                        : overdue
                        ? "bg-red-500"
                        : m.status === "in_progress"
                        ? "bg-yellow-500"
                        : "bg-blue-400"
                    }`}
                  />

                  <div
                    className={`rounded-lg border p-4 ${
                      overdue ? "border-red-300 bg-red-50/40" : "bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <p
                          className={`font-semibold ${
                            overdue ? "text-red-700" : ""
                          }`}
                        >
                          {m.title}
                        </p>
                        {m.description && (
                          <p className="text-sm text-muted-foreground">
                            {m.description}
                          </p>
                        )}
                        {m.due_date && (
                          <p
                            className={`text-xs ${
                              overdue
                                ? "font-medium text-[#ff8c8c]"
                                : "text-muted-foreground"
                            }`}
                          >
                            Due: {new Date(m.due_date).toLocaleDateString()}
                            {overdue && " · Overdue"}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={STATUS_STYLES[m.status] ?? ""}>
                          {m.status.replace("_", " ")}
                        </Badge>
                        {isManager && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(m)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteMilestone.mutate(m.milestone_id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Milestone</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="m-title">Title *</Label>
              <Input
                id="m-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Milestone title"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-desc">Description</Label>
              <Textarea
                id="m-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Optional description..."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-due">Due Date</Label>
              <Input
                id="m-due"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMilestone.isPending}>
                {createMilestone.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Milestone</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as MilestoneStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["upcoming", "in_progress", "completed", "missed"] as MilestoneStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMilestone.isPending}>
                {updateMilestone.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
