"use client";

import { useState } from "react";
import { Menu, Search, User, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";

interface TopNavProps {
  onMenuToggle: () => void;
}

export function TopNav({ onMenuToggle }: TopNavProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header
      role="banner"
      className="sticky top-0 z-40 flex h-14 items-center border-b bg-background px-4 lg:px-6"
    >
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuToggle}
        aria-label="Toggle navigation menu"
        aria-expanded={undefined}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      <div className="flex items-center gap-2 ml-2 md:ml-0">
        <span className="text-lg font-semibold tracking-tight" aria-label="AWS Architecture Generator">
          AWS Architecture Generator
        </span>
      </div>

      <div className="flex-1 flex justify-center px-4">
        <div className="relative w-full max-w-md" role="search" aria-label="Site search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search diagrams, templates..."
            className="w-full rounded-md border border-input bg-background px-9 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Search diagrams and templates"
          />
        </div>
      </div>

      <div className="flex items-center gap-1" role="toolbar" aria-label="User actions">
        <ThemeToggle />
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            aria-label="User menu"
            aria-haspopup="true"
            aria-expanded={userMenuOpen}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <User className="h-5 w-5" aria-hidden="true" />
          </Button>
          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border bg-popover p-1 shadow-lg">
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                >
                  <Settings className="h-4 w-4" /> Settings
                </Link>
                <Link
                  href="/auth/login"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive hover:bg-accent"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
