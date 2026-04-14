"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Activity, CheckCircle2, Radar, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DashboardStats, Task } from "@/types";

function useDashboardStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await api.get<{ stats: DashboardStats }>("/stats");
      return res.data.stats;
    },
  });
}

function useMyAssignedTasks(enabled: boolean) {
  return useQuery({
    queryKey: ["tasks", "me", "dashboard"],
    queryFn: async () => {
      const res = await api.get<{ data: Task[] }>("/tasks/me", {
        params: { page: 1, pageSize: 8, order: "asc", sort: "due_date" },
      });
      return res.data.data;
    },
    enabled,
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats } = useDashboardStats();
  const {
    data: myTasks,
    isLoading: isMyTasksLoading,
  } = useMyAssignedTasks(user?.role === "member");

  const metrics = [
    {
      label: "Active Projects",
      value: stats ? String(stats.active_projects) : "—",
      icon: Radar,
    },
    {
      label: "Tasks Done",
      value: stats ? String(stats.completed_tasks) : "—",
      icon: CheckCircle2,
    },
    {
      label: "Completion Rate",
      value: stats ? `${stats.completion_rate}%` : "—",
      icon: Activity,
    },
    {
      label: "Overdue Tasks",
      value: stats ? String(stats.overdue_tasks) : "—",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6 [animation:floatIn_420ms_ease-out]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back, {user?.first_name}!</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-muted-foreground">
          Live Monitoring
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, idx) => (
          <Card key={metric.label} className={`[animation:floatIn_520ms_ease-out]`} style={{ animationDelay: `${idx * 80}ms` }}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <metric.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-3xl font-bold text-white">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 text-sm font-semibold text-white">Project Summary</CardHeader>
          <CardContent className="space-y-3">
            {stats ? (
              <>
                <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                  <span className="text-xs text-muted-foreground">Total Projects</span>
                  <div className="h-8 rounded-full bg-white/5 p-1">
                    <div
                      className="h-full rounded-full bg-[#77b5ff] px-3 text-right text-xs font-semibold leading-6 text-black transition-all duration-500"
                      style={{ width: `${Math.min((stats.total_projects / Math.max(stats.total_projects, 1)) * 100, 100)}%` }}
                    >
                      {stats.total_projects}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                  <span className="text-xs text-muted-foreground">Active</span>
                  <div className="h-8 rounded-full bg-white/5 p-1">
                    <div
                      className="h-full rounded-full bg-[#a2ff56] px-3 text-right text-xs font-semibold leading-6 text-black transition-all duration-500"
                      style={{ width: `${Math.min((stats.active_projects / Math.max(stats.total_projects, 1)) * 100, 100)}%` }}
                    >
                      {stats.active_projects}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                  <span className="text-xs text-muted-foreground">Total Tasks</span>
                  <div className="h-8 rounded-full bg-white/5 p-1">
                    <div
                      className="h-full rounded-full bg-[#f5f5f5] px-3 text-right text-xs font-semibold leading-6 text-black transition-all duration-500"
                      style={{ width: `${Math.min((stats.total_tasks / Math.max(stats.total_tasks, 1)) * 100, 100)}%` }}
                    >
                      {stats.total_tasks}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                  <span className="text-xs text-muted-foreground">Completed</span>
                  <div className="h-8 rounded-full bg-white/5 p-1">
                    <div
                      className="h-full rounded-full bg-[#ffad33] px-3 text-right text-xs font-semibold leading-6 text-black transition-all duration-500"
                      style={{ width: `${Math.min((stats.completed_tasks / Math.max(stats.total_tasks, 1)) * 100, 100)}%` }}
                    >
                      {stats.completed_tasks}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Loading stats...</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 text-sm font-semibold text-white">Account</CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium text-white">{user?.first_name} {user?.last_name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="max-w-[70%] truncate font-medium text-white">{user?.email}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Role</dt>
                <dd className="font-medium capitalize text-[#b5ff66]">{user?.role}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium capitalize text-white">{user?.status}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {user?.role === "member" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base text-white">My Assigned Tasks</CardTitle>
            <Link href="/projects" className="text-xs text-primary hover:underline">
              Open projects
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {isMyTasksLoading ? (
              <p className="text-sm text-muted-foreground">Loading your tasks...</p>
            ) : (myTasks?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks currently assigned to you.</p>
            ) : (
              myTasks!.map((task) => (
                <Link
                  key={task.task_id}
                  href={`/tasks/${task.task_id}`}
                  className="block rounded-md border border-white/10 px-3 py-2 hover:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-white">{task.title}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {task.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {task.project?.project_name ?? "Project"}{task.due_date ? ` • Due ${new Date(task.due_date).toLocaleDateString()}` : ""}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
