"use client";

import { useState } from "react";
import { Menu, Search, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

interface TopNavProps {
  onMenuToggle: () => void;
}

function getInitials(name?: string, email?: string): string {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  if (email) return email[0].toUpperCase();
  return 'U';
}

function getAvatarColor(str: string): string {
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500', 'bg-indigo-500'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function TopNav({ onMenuToggle }: TopNavProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const initials = getInitials(user?.name, user?.email);
  const avatarColor = getAvatarColor(user?.email || 'default');

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
        <span className="text-lg font-semibold tracking-tight" aria-label="Cloud Architecture Generator">
          Cloud Architecture Generator
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
          <button
            className="flex items-center gap-2 rounded-full p-1 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="User menu"
            aria-haspopup="true"
            aria-expanded={userMenuOpen}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${avatarColor} text-white text-xs font-bold`}>
              {initials}
            </div>
            {isAuthenticated && (
              <span className="hidden text-sm font-medium text-foreground sm:inline">{displayName}</span>
            )}
          </button>
          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border bg-popover p-1 shadow-lg">
                {isAuthenticated && (
                  <div className="px-3 py-2 border-b mb-1">
                    <p className="text-sm font-medium">{user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                )}
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                >
                  <Settings className="h-4 w-4" /> Settings
                </Link>
                <Link
                  href="/auth/login"
                  onClick={async (e) => {
                    e.preventDefault();
                    setUserMenuOpen(false);
                    try {
                      const { signOut } = await import('aws-amplify/auth');
                      await signOut();
                    } catch {}
                    window.location.href = '/auth/login';
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive hover:bg-accent"
                >
                  <LogOut className="h-4 w-4" /> {isAuthenticated ? 'Sign Out' : 'Sign In'}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
