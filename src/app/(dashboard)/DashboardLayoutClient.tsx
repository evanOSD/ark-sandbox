"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";

interface DashboardLayoutClientProps {
  role: string;
  username: string;
  initialState: string;
  children: React.ReactNode;
}

export function DashboardLayoutClient({
  role,
  username,
  initialState,
  children,
}: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(initialState === "collapsed");

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    // Set cookie to remember user preference across refreshes (lasts 1 year)
    document.cookie = `sidebar_state=${newState ? "collapsed" : "expanded"}; path=/; max-age=31536000`;
  };

  // Determine if this is a project workspace page
  const isWorkspace =
    pathname.startsWith("/projects/") &&
    pathname !== "/projects/create" &&
    !pathname.endsWith("/edit");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        role={role}
        username={username}
        isCollapsed={isCollapsed}
        toggleSidebar={toggleSidebar}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main
          className={cn(
            "flex-1 overflow-y-auto",
            isWorkspace ? "p-0 overflow-hidden flex flex-col h-full bg-zinc-950" : "p-4 md:p-6 lg:p-8"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
