"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import {
  Card,
  CardContent,
  CardHeader
} from "@/components/ui/card";
import { Activity, CheckCircle2, Radar, Sparkles } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

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
        {[
          { label: "Efficiency", value: "82%", icon: Activity },
          { label: "Projects", value: "12", icon: Radar },
          { label: "Tasks Done", value: "148", icon: CheckCircle2 },
          { label: "Performance", value: "A+", icon: Sparkles },
        ].map((metric, idx) => (
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
          <CardHeader className="pb-3 text-sm font-semibold text-white">Projects Timeline</CardHeader>
          <CardContent className="space-y-3">
            {[
              { day: "30.09", width: "42%", color: "bg-[#a2ff56]", value: "16" },
              { day: "29.09", width: "74%", color: "bg-[#ffad33]", value: "29" },
              { day: "28.09", width: "56%", color: "bg-[#f5f5f5]", value: "21" },
              { day: "27.09", width: "36%", color: "bg-[#77b5ff]", value: "10" },
            ].map((item) => (
              <div key={item.day} className="grid grid-cols-[48px_1fr] items-center gap-3">
                <span className="text-xs text-muted-foreground">{item.day}</span>
                <div className="h-8 rounded-full bg-white/5 p-1">
                  <div
                    className={`h-full rounded-full ${item.color} px-3 text-right text-xs font-semibold leading-6 text-black transition-all duration-500`}
                    style={{ width: item.width }}
                  >
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
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
    </div>
  );
}
