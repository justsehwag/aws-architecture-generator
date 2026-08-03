"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormatCard, type FormatOption } from "./FormatCard";
import {
  useExport,
  type ExportFormat,
  type ExportOptions,
} from "@/hooks/useExport";
import { cn } from "@/lib/utils";

// --- Format definitions ---

const FORMAT_OPTIONS: FormatOption[] = [
  {
    format: "drawio",
    name: ".drawio (Native)",
    description: "Editable Draw.io XML file",
    icon: <FileIcon />,
  },
  {
    format: "png",
    name: "PNG",
    description: "High-resolution raster image",
    icon: <ImageIcon />,
  },
  {
    format: "svg",
    name: "SVG",
    description: "Scalable vector graphic",
    icon: <VectorIcon />,
  },
  {
    format: "pdf",
    name: "PDF",
    description: "Printable document",
    icon: <DocumentIcon />,
  },
  {
    format: "json",
    name: "JSON",
    description: "Architecture specification data",
    icon: <CodeIcon />,
  },
  {
    format: "markdown",
    name: "Markdown",
    description: "Architecture documentation",
    icon: <MarkdownIcon />,
  },
  {
    format: "pptx",
    name: "PowerPoint",
    description: "Editable PPTX presentation",
    icon: <PresentationIcon />,
  },
];

const DPI_OPTIONS = [300, 600, 1200] as const;
const PAGE_SIZE_OPTIONS: { value: NonNullable<ExportOptions["pdfPageSize"]>; label: string }[] = [
  { value: "a4", label: "A4" },
  { value: "letter", label: "Letter" },
  { value: "a3", label: "A3" },
];

// --- Component Props ---

export interface ExportDialogProps {
  diagramId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * ExportDialog component using shadcn/ui Dialog.
 * Shows format selection with format-specific options (DPI, page size).
 * Handles download trigger via presigned URL.
 * Displays error for unsupported formats listing valid options.
 * Handles export failures without producing partial files.
 *
 * Validates: Requirements 4.8, 4.9
 */
export function ExportDialog({
  diagramId,
  open,
  onOpenChange,
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = React.useState<ExportFormat>("drawio");
  const [pngDpi, setPngDpi] = React.useState<number>(300);
  const [pdfPageSize, setPdfPageSize] = React.useState<NonNullable<ExportOptions["pdfPageSize"]>>("a4");

  const { state, exportDiagram, reset } = useExport();

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      reset();
      setSelectedFormat("drawio");
      setPngDpi(300);
      setPdfPageSize("a4");
    }
  }, [open, reset]);

  const handleExport = async () => {
    const options: ExportOptions = {};
    if (selectedFormat === "png") {
      options.pngDpi = pngDpi;
    }
    if (selectedFormat === "pdf") {
      options.pdfPageSize = pdfPageSize;
    }

    await exportDiagram(diagramId, selectedFormat, options);
  };

  const handleDownload = () => {
    if (state.downloadUrl) {
      window.open(state.downloadUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Diagram</DialogTitle>
          <DialogDescription>
            Choose a format and export your architecture diagram.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format selection */}
          {state.status !== "success" && (
            <>
              <div
                className="grid gap-2"
                role="radiogroup"
                aria-label="Export format"
              >
                {FORMAT_OPTIONS.map((option) => (
                  <FormatCard
                    key={option.format}
                    option={option}
                    selected={selectedFormat === option.format}
                    onSelect={setSelectedFormat}
                  />
                ))}
              </div>

              {/* PNG-specific options: DPI */}
              {selectedFormat === "png" && (
                <div className="rounded-md border border-border p-3">
                  <span className="text-sm font-medium">
                    Resolution (DPI)
                  </span>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Minimum 300 DPI for print quality
                  </p>
                  <div
                    className="mt-2 flex gap-2"
                    role="radiogroup"
                    aria-label="DPI selection"
                  >
                    {DPI_OPTIONS.map((dpi) => (
                      <button
                        key={dpi}
                        type="button"
                        onClick={() => setPngDpi(dpi)}
                        className={cn(
                          "rounded-md border px-3 py-1.5 text-sm transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          pngDpi === dpi
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-accent"
                        )}
                        role="radio"
                        aria-checked={pngDpi === dpi}
                      >
                        {dpi} DPI
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PDF-specific options: Page size */}
              {selectedFormat === "pdf" && (
                <div className="rounded-md border border-border p-3">
                  <span className="text-sm font-medium">Page Size</span>
                  <div
                    className="mt-2 flex gap-2"
                    role="radiogroup"
                    aria-label="Page size selection"
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPdfPageSize(option.value)}
                        className={cn(
                          "rounded-md border px-3 py-1.5 text-sm transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          pdfPageSize === option.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-accent"
                        )}
                        role="radio"
                        aria-checked={pdfPageSize === option.value}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Error state */}
          {state.status === "error" && (
            <div
              className="rounded-md border border-destructive/50 bg-destructive/10 p-3"
              role="alert"
              aria-live="assertive"
            >
              <p className="text-sm font-medium text-destructive">
                Export Failed
              </p>
              <p className="mt-1 text-sm text-destructive/90">
                {state.error}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleExport}
                aria-label="Retry export"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Success state */}
          {state.status === "success" && (
            <div
              className="rounded-md border border-green-500/50 bg-green-500/10 p-4 text-center"
              role="status"
              aria-live="polite"
            >
              <SuccessIcon className="mx-auto h-10 w-10 text-green-600" />
              <p className="mt-2 text-sm font-medium">
                Export ready for download
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your {state.format?.toUpperCase()} file is ready.
              </p>
              <Button
                className="mt-3"
                onClick={handleDownload}
                aria-label="Download exported file"
              >
                <DownloadIcon className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">
              {state.status === "success" ? "Close" : "Cancel"}
            </Button>
          </DialogClose>
          {state.status !== "success" && (
            <Button
              onClick={handleExport}
              disabled={state.status === "exporting"}
              aria-label={
                state.status === "exporting"
                  ? "Exporting diagram..."
                  : "Export diagram"
              }
            >
              {state.status === "exporting" ? (
                <>
                  <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                "Export"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Inline SVG icons ---

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
      aria-hidden="true"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

function VectorIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
      aria-hidden="true"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
      aria-hidden="true"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  );
}

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
      aria-hidden="true"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function MarkdownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
      aria-hidden="true"
    >
      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M7 15V9l2.5 3L12 9v6" />
      <path d="M17 9v6l-2-2" />
    </svg>
  );
}

function SuccessIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function PresentationIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
      aria-hidden="true"
    >
      <path d="M2 3h20" />
      <path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" />
      <path d="m7 21 5-5 5 5" />
    </svg>
  );
}
