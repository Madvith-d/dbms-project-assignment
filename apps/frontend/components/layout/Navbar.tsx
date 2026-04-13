"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const { user } = useAuth();

  return (
    <header className="flex h-16 items-center justify-end border-b bg-card px-6">
      {user && (
        <div className="flex items-center gap-3">
          <Badge
            className={
              user.role === "admin"
                ? "bg-red-100 text-red-800 hover:bg-red-100"
                : user.role === "manager"
                ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                : "bg-gray-100 text-gray-800 hover:bg-gray-100"
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
