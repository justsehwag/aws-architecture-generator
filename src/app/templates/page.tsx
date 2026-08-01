"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TemplateGallery } from "@/components/templates/TemplateGallery";

/**
 * Templates page.
 *
 * Integrates the TemplateGallery component and navigates to the diagram
 * viewer when a template is successfully loaded.
 *
 * Validates: Requirement 11.4
 */
export default function TemplatesPage() {
  const router = useRouter();

  const handleTemplateLoaded = (diagramId: string) => {
    router.push(`/diagram/${diagramId}`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Templates
        </h1>
        <p className="mt-1 text-muted-foreground">
          Browse architecture templates to kickstart your diagram. Select a
          template to load it into the editor.
        </p>
      </div>

      <TemplateGallery onTemplateLoaded={handleTemplateLoaded} />
    </div>
  );
}
