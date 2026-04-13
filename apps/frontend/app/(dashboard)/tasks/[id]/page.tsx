"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTask } from "@/lib/hooks/useTasks";
import { useAuth } from "@/lib/hooks/useAuth";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Comment, Attachment, TimeLog, Task } from "@/types";
import { Paperclip, Trash2, Download, Clock, Plus, MessageSquare, CheckSquare } from "lucide-react";
import Link from "next/link";

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-blue-100 text-blue-800",
  low: "bg-gray-100 text-gray-800",
};

const STATUS_STYLES: Record<string, string> = {
  backlog: "bg-gray-100 text-gray-700",
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-yellow-100 text-yellow-800",
  in_review: "bg-purple-100 text-purple-800",
  done: "bg-green-100 text-green-800",
};

// ── Subtasks ──────────────────────────────────────────────────────────────────

function SubtasksSection({ taskId, task }: { taskId: string; task: Task }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: subtasks } = useQuery({
    queryKey: ["subtasks", taskId],
    queryFn: async () => {
      const res = await api.get<{ tasks: Task[] }>(`/tasks/${taskId}/subtasks`);
      return res.data.tasks;
    },
    enabled: !!taskId,
  });

  const createSubtask = useMutation({
    mutationFn: async (title: string) => {
      await api.post(`/projects/${task.project_id}/tasks`, {
        title,
        parent_task_id: taskId,
        status: "todo",
        priority: "medium",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", taskId] });
      setNewTitle("");
      setAdding(false);
    },
  });

  const canAdd =
    user?.role === "manager" ||
    user?.role === "admin" ||
    task.assignee_id === user?.user_id;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="h-4 w-4" /> Subtasks ({subtasks?.length ?? 0})
          </CardTitle>
          {canAdd && !adding && (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Plus className="mr-1 h-3 w-3" /> Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {subtasks?.map((sub) => (
          <Link key={sub.task_id} href={`/tasks/${sub.task_id}`}>
            <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted">
              <span className="text-sm">{sub.title}</span>
              <Badge className={`${STATUS_STYLES[sub.status] ?? ""} text-xs`}>
                {sub.status.replace("_", " ")}
              </Badge>
            </div>
          </Link>
        ))}
        {adding && (
          <div className="flex gap-2 pt-1">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Subtask title..."
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTitle.trim()) createSubtask.mutate(newTitle.trim());
                if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
              }}
            />
            <Button
              size="sm"
              disabled={!newTitle.trim() || createSubtask.isPending}
              onClick={() => newTitle.trim() && createSubtask.mutate(newTitle.trim())}
            >
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewTitle(""); }}>
              Cancel
            </Button>
          </div>
        )}
        {(!subtasks || subtasks.length === 0) && !adding && (
          <p className="text-sm text-muted-foreground">No subtasks yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Comments ──────────────────────────────────────────────────────────────────

function CommentsSection({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");

  const { data: comments } = useQuery({
    queryKey: ["comments", taskId],
    queryFn: async () => {
      const res = await api.get<{ comments: Comment[] }>(`/tasks/${taskId}/comments`);
      return res.data.comments;
    },
  });

  const addComment = useMutation({
    mutationFn: async (text: string) => {
      await api.post(`/tasks/${taskId}/comments`, { comment_text: text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
      setCommentText("");
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
    },
  });

  const canComment = user?.role === "manager" || user?.role === "admin" || user?.role === "member";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Comments ({comments?.length ?? 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments?.map((c) => {
          const canDelete =
            user?.role === "admin" ||
            user?.role === "manager" ||
            c.user_id === user?.user_id;
          return (
            <div key={c.comment_id} className="rounded-md border p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {c.user
                    ? `${c.user.first_name} ${c.user.last_name}`
                    : c.user_id}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteComment.mutate(c.comment_id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap">{c.comment_text}</p>
            </div>
          );
        })}
        {(!comments || comments.length === 0) && (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        )}
        {canComment && (
          <div className="space-y-2 pt-2 border-t">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
            />
            <Button
              size="sm"
              disabled={!commentText.trim() || addComment.isPending}
              onClick={() => commentText.trim() && addComment.mutate(commentText.trim())}
            >
              {addComment.isPending ? "Posting..." : "Post Comment"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Attachments ───────────────────────────────────────────────────────────────

function AttachmentsSection({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: attachments } = useQuery({
    queryKey: ["attachments", taskId],
    queryFn: async () => {
      const res = await api.get<{ attachments: Attachment[] }>(`/tasks/${taskId}/attachments`);
      return res.data.attachments;
    },
  });

  const uploadAttachment = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      await api.post(`/tasks/${taskId}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", taskId] });
    },
  });

  const deleteAttachment = useMutation({
    mutationFn: async (attachmentId: string) => {
      await api.delete(`/attachments/${attachmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", taskId] });
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadAttachment.mutate(file);
    e.target.value = "";
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="h-4 w-4" /> Attachments ({attachments?.length ?? 0})
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Plus className="mr-1 h-3 w-3" /> Upload
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {attachments?.map((a) => {
          const canDelete =
            user?.role === "admin" ||
            user?.role === "manager" ||
            a.uploaded_by === user?.user_id;
          return (
            <div key={a.attachment_id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm truncate max-w-[200px]">{a.file_name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
                <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/attachments/${a.attachment_id}`} target="_blank" rel="noreferrer">
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </a>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteAttachment.mutate(a.attachment_id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {(!attachments || attachments.length === 0) && (
          <p className="text-sm text-muted-foreground">No attachments yet.</p>
        )}
        {uploadAttachment.isPending && (
          <p className="text-xs text-muted-foreground">Uploading...</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Time Logs ─────────────────────────────────────────────────────────────────

function TimeLogsSection({ taskId }: { taskId: string }) {
  const queryClient = useQueryClient();
  const [hours, setHours] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [desc, setDesc] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");

  const { data: timeLogs } = useQuery({
    queryKey: ["timelogs", taskId],
    queryFn: async () => {
      const res = await api.get<{ time_logs: TimeLog[] }>(`/tasks/${taskId}/timelogs`);
      return res.data.time_logs;
    },
  });

  const addTimeLog = useMutation({
    mutationFn: async (data: { hours_logged: number; log_date: string; description?: string }) => {
      await api.post(`/tasks/${taskId}/timelogs`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timelogs", taskId] });
      setHours("");
      setLogDate(new Date().toISOString().split("T")[0]);
      setDesc("");
      setShowForm(false);
      setFormError("");
    },
    onError: () => setFormError("Failed to log time."),
  });

  const totalHours = (timeLogs ?? []).reduce((sum, l) => sum + l.hours_logged, 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0 || h > 24) {
      setFormError("Hours must be between 0 and 24.");
      return;
    }
    addTimeLog.mutate({ hours_logged: h, log_date: logDate, description: desc || undefined });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Time Logs
            {totalHours > 0 && (
              <span className="text-xs text-muted-foreground font-normal ml-1">
                ({totalHours.toFixed(1)}h total)
              </span>
            )}
          </CardTitle>
          {!showForm && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="mr-1 h-3 w-3" /> Log Time
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {timeLogs?.map((l) => (
          <div key={l.log_id} className="flex items-start justify-between rounded-md border px-3 py-2">
            <div>
              <p className="text-sm font-medium">{l.hours_logged}h</p>
              {l.description && (
                <p className="text-xs text-muted-foreground">{l.description}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {new Date(l.log_date).toLocaleDateString()}
              </p>
              {l.user && (
                <p className="text-xs text-muted-foreground">
                  {l.user.first_name} {l.user.last_name}
                </p>
              )}
            </div>
          </div>
        ))}
        {(!timeLogs || timeLogs.length === 0) && !showForm && (
          <p className="text-sm text-muted-foreground">No time logged yet.</p>
        )}
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3 border-t pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="hours">Hours (0–24) *</Label>
                <Input
                  id="hours"
                  type="number"
                  min="0.25"
                  max="24"
                  step="0.25"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="1.5"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="log_date">Date *</Label>
                <Input
                  id="log_date"
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="log_desc">Description</Label>
              <Input
                id="log_desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="What did you work on?"
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={addTimeLog.isPending}>
                {addTimeLog.isPending ? "Saving..." : "Log Time"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

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
        <div className="space-y-1">
          <Link
            href={`/projects/${task.project_id}/tasks`}
            className="text-xs text-muted-foreground hover:underline"
          >
            ← Back to tasks
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">{task.title}</h2>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Badge className={STATUS_STYLES[task.status] ?? ""}>
            {task.status.replace("_", " ")}
          </Badge>
          <Badge className={PRIORITY_STYLES[task.priority] ?? ""}>
            {task.priority}
          </Badge>
        </div>
      </div>

      {/* Details card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            {task.description && (
              <div>
                <dt className="font-medium text-muted-foreground">Description</dt>
                <dd className="mt-1 whitespace-pre-wrap">{task.description}</dd>
              </div>
            )}
            {task.assignee && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Assignee</dt>
                <dd className="font-medium">
                  {task.assignee.first_name} {task.assignee.last_name}
                </dd>
              </div>
            )}
            {task.due_date && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Due Date</dt>
                <dd className={`font-medium ${new Date(task.due_date) < new Date() && task.status !== "done" ? "text-red-600" : ""}`}>
                  {new Date(task.due_date).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <SubtasksSection taskId={params.id} task={task} />
      <CommentsSection taskId={params.id} />
      <AttachmentsSection taskId={params.id} />
      <TimeLogsSection taskId={params.id} />
    </div>
  );
}
