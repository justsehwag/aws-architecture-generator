"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  LayoutTemplate,
  FolderOpen,
  Upload,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Create Diagram",
    href: "/create",
    icon: PlusCircle,
  },
  {
    label: "Templates",
    href: "/templates",
    icon: LayoutTemplate,
  },
  {
    label: "Saved Diagrams",
    href: "/diagrams",
    icon: FolderOpen,
  },
  {
    label: "Import",
    href: "/import",
    icon: Upload,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navRef = useKeyboardNavigation<HTMLElement>({
    orientation: "vertical",
    wrap: true,
    onEscape: onClose,
    onSelect: (el) => el.click(),
    itemSelector: "a[href]",
    enabled: open || typeof window !== "undefined" && window.innerWidth >= 768,
  });

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-14 left-0 z-50 h-[calc(100vh-3.5rem)] w-64 border-r bg-background transition-transform duration-200 ease-in-out md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        role="navigation"
        aria-label="Sidebar navigation"
        aria-hidden={!open && typeof window !== "undefined" && window.innerWidth < 768 ? true : undefined}
      >
        <nav
          ref={navRef}
          className="flex flex-col gap-1 p-4"
          aria-label="Main navigation"
        >
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
