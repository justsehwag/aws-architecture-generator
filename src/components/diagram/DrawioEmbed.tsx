"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DrawioEmbedProps {
  /** Draw.io XML content to render */
  xml: string;
  /** CSS class name for the container */
  className?: string;
  /** Whether the diagram is editable */
  editable?: boolean;
  /** Callback when XML changes (user edits diagram) */
  onXmlChange?: (xml: string) => void;
}

/**
 * Embeds the Draw.io editor/viewer via iframe.
 * Renders official AWS Architecture Icons natively using
 * Draw.io's built-in mxgraph.aws4 shape library.
 *
 * Uses draw.io's embed mode via postMessage API.
 */
export function DrawioEmbed({
  xml,
  className,
  editable = true,
  onXmlChange,
}: DrawioEmbedProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const xmlRef = React.useRef(xml);

  // Keep ref in sync
  React.useEffect(() => {
    xmlRef.current = xml;
  }, [xml]);

  // Handle messages from draw.io iframe
  React.useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== "string") return;

      try {
        const msg = JSON.parse(event.data);

        // Draw.io is ready — load the XML
        if (msg.event === "init") {
          setIsLoaded(true);
          const iframe = iframeRef.current;
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage(
              JSON.stringify({
                action: "load",
                xml: xmlRef.current,
                autosave: 1,
              }),
              "*"
            );
          }
        }

        // User saved/autosaved — get updated XML
        if (msg.event === "save" || msg.event === "autosave") {
          if (msg.xml && onXmlChange) {
            onXmlChange(msg.xml);
          }
        }

        // Export completed
        if (msg.event === "export") {
          // Handle export data if needed
        }
      } catch {
        // Not a JSON message, ignore
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onXmlChange]);

  // Build draw.io embed URL with AWS libraries enabled
  const drawioUrl = React.useMemo(() => {
    const params = new URLSearchParams({
      embed: "1",
      proto: "json",
      spin: "1",
      libraries: "1",
      // Load all AWS shape libraries
      libs: "aws4",
      ui: "dark",
      noSaveBtn: "1",
      noExitBtn: "1",
      saveAndExit: "0",
    });
    return `https://embed.diagrams.net/?${params.toString()}`;
  }, [editable]);

  return (
    <div className={cn("relative h-full w-full", className)}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Loading diagram editor...
            </p>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={drawioUrl}
        className="h-full w-full border-0"
        title="Architecture Diagram Editor"
        allow="clipboard-read; clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
}
