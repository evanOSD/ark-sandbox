"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Folder,
  Film,
  Users,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/login/actions";
import Image from "next/image";

interface SidebarProps {
  role: string;
  username: string;
  isCollapsed?: boolean;
  toggleSidebar?: () => void;
}

export function Sidebar({
  role,
  username,
  isCollapsed = false,
  toggleSidebar,
}: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    {
      icon: Folder,
      label: role === "admin" ? "Proyek" : "Proyek Saya",
      href: "/projects",
    },
    ...(role === "admin"
      ? [
          { icon: Film, label: "Templates", href: "/templates" },
          { icon: Users, label: "Users", href: "/users" },
        ]
      : []),
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <aside
      className={cn(
        "hidden flex-col border-r bg-card md:flex transition-all duration-300 ease-in-out shrink-0",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* Sidebar Header Toggler Row */}
      <div
        className={cn(
          "flex h-14 items-center border-b transition-all duration-300 ease-in-out",
          isCollapsed ? "px-2 justify-center" : "px-4 lg:px-6",
        )}
      >
        {!isCollapsed ? (
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
              title="Sembunyikan Sidebar"
            >
              <Image
                src="/logo/logo-ark-main-transparent.svg"
                alt="ARK Logo"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="font-bold text-2xl tracking-tight text-primary">
                ARK
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="hover:bg-muted h-8 w-8 shrink-0"
              title="Sembunyikan Sidebar"
            >
              <Menu className="h-5 w-5 text-foreground" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="hover:bg-muted h-8 w-8 shrink-0"
            title="Tampilkan Sidebar"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-x-hidden overflow-y-auto py-4">
        {!isCollapsed && (
          <div className="px-4 py-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
            Menu ({role})
          </div>
        )}
        <nav
          className={cn(
            "grid items-start text-sm font-medium space-y-1",
            isCollapsed ? "px-1.5" : "px-2 lg:px-4",
          )}
        >
          {menuItems.map((item, index) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg py-2.5 transition-all hover:text-primary",
                  isCollapsed ? "justify-center px-0" : "gap-3 px-3",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div
        className={cn(
          "mt-auto border-t space-y-3 transition-all duration-300 ease-in-out",
          isCollapsed ? "p-2" : "p-4",
        )}
      >
        <div
          className={cn(
            "flex items-center bg-muted/40 rounded-lg transition-all duration-300 ease-in-out w-full",
            isCollapsed ? "p-1 justify-center" : "gap-2 px-2 py-1.5",
          )}
          title={isCollapsed ? `${username} (${role})` : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
            {username.substring(0, 2).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold truncate text-foreground">
                {username}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">
                {role}
              </span>
            </div>
          )}
        </div>
        <form action={logout} className="w-full">
          <Button
            type="submit"
            variant="ghost"
            className={cn(
              "w-full gap-2 text-muted-foreground hover:text-foreground transition-all duration-300 ease-in-out",
              isCollapsed ? "justify-center px-0" : "justify-start px-3",
            )}
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </Button>
        </form>
      </div>
    </aside>
  );
}
