"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const { user } = useAuth();

  return (
    <header className="mx-3 mt-3 flex h-16 items-center justify-end rounded-2xl border border-white/10 bg-white/[0.03] px-6">
      {user && (
        <div className="flex items-center gap-3">
          <Badge
            className={
              user.role === "admin"
                ? "border border-[#ff6b6b66] bg-[#ff6b6b22] text-[#ff9b9b] hover:bg-[#ff6b6b33]"
                : user.role === "manager"
                ? "border border-[#5aa6ff66] bg-[#5aa6ff22] text-[#9fceff] hover:bg-[#5aa6ff33]"
                : "border border-white/15 bg-white/10 text-slate-200 hover:bg-white/15"
            }
          >
            {user.role}
          </Badge>
          <span className="text-sm font-medium">
            {user.first_name} {user.last_name}
          </span>
        </div>
      )}
    </header>
  );
}
