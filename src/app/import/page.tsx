'use client';

import { useRouter } from 'next/navigation';
import { ImportUploader } from '@/components/import/ImportUploader';

export default function ImportPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Import Diagram</h1>
        <p className="mt-1 text-muted-foreground">
          Upload an existing .drawio file to view, edit, and analyze it.
        </p>
      </div>

      <ImportUploader
        onImportSuccess={(result) => router.push(`/diagram/${result.diagramId}`)}
        onImportError={() => {}}
      />
    </div>
  );
}
