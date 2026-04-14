"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  LogOut,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["admin", "manager", "member"],
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
    roles: ["admin", "manager", "member"],
  },
  {
    label: "Profile",
    href: "/profile",
    icon: UserCircle,
    roles: ["admin", "manager", "member"],
  },
  {
    label: "Users",
    href: "/admin",
    icon: Users,
    roles: ["admin"],
  },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const filteredItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <aside className="glass-panel m-3 flex h-[calc(100vh-1.5rem)] w-64 flex-col rounded-3xl">
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <h1 className="text-lg font-semibold tracking-wide text-white">PM Platform</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "neon-ring bg-primary/90 text-primary-foreground"
                  : "text-muted-foreground hover:bg-white/10 hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        {user && (
          <div className="mb-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-sm font-medium">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-white/10 hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
