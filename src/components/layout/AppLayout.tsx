"use client";

import * as React from "react";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import { SkipLink } from "@/components/ui/skip-link";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background">
      <SkipLink targetId="main-content" />
      <TopNav onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main
          id="main-content"
          role="main"
          className="flex-1 overflow-auto p-4 lg:p-6"
          tabIndex={-1}
          aria-label="Main content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
