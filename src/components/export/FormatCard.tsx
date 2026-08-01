"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { ExportFormat } from "@/hooks/useExport";

export interface FormatOption {
  format: ExportFormat;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface FormatCardProps {
  option: FormatOption;
  selected: boolean;
  onSelect: (format: ExportFormat) => void;
}

/**
 * Individual format option card showing format name, icon, and description.
 * Renders as a radio button within the format selection radiogroup.
 */
export function FormatCard({ option, selected, onSelect }: FormatCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.format)}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border"
      )}
      role="radio"
      aria-checked={selected}
      aria-label={`Export as ${option.name}`}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
        aria-hidden="true"
      >
        {option.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{option.name}</div>
        <div className="text-xs text-muted-foreground">
          {option.description}
        </div>
      </div>
    </button>
  );
}
