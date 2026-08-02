/**
 * Soft-Delete Storage Module
 *
 * Provides soft-delete, restore, permanent delete, and auto-expiry
 * for diagrams stored in localStorage.
 *
 * localStorage keys:
 * - "deleted_diagrams": Array of DeletedDiagram objects
 * - "diagram_drafts": Array of active diagram drafts
 */

// --- Types ---

export interface DeletedDiagram {
  diagramId: string;
  name: string;
  xml: string;
  metadata?: Record<string, unknown>;
  deletedAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp (deletedAt + 30 days)
}

interface DiagramDraft {
  diagramId: string;
  name: string;
  createdAt: string;
  xml?: string;
  spec?: unknown;
  [key: string]: unknown;
}

// --- Constants ---

const DELETED_DIAGRAMS_KEY = "deleted_diagrams";
const DIAGRAM_DRAFTS_KEY = "diagram_drafts";
const EXPIRY_DAYS = 30;

// --- Helpers ---

function getDeletedStore(): DeletedDiagram[] {
  try {
    const raw = localStorage.getItem(DELETED_DIAGRAMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setDeletedStore(diagrams: DeletedDiagram[]): void {
  try {
    localStorage.setItem(DELETED_DIAGRAMS_KEY, JSON.stringify(diagrams));
  } catch {
    // QuotaExceededError — silently fail
  }
}

function getDraftsStore(): DiagramDraft[] {
  try {
    const raw = localStorage.getItem(DIAGRAM_DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setDraftsStore(drafts: DiagramDraft[]): void {
  try {
    localStorage.setItem(DIAGRAM_DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    // QuotaExceededError — silently fail
  }
}

// --- Public API ---

/**
 * Soft-delete a diagram: moves it from diagram_drafts to deleted_diagrams
 * with deletedAt and expiresAt timestamps.
 */
export function softDeleteDiagram(diagramId: string): void {
  const drafts = getDraftsStore();
  const idx = drafts.findIndex((d) => d.diagramId === diagramId);
  if (idx === -1) return;

  const diagram = drafts[idx];
  drafts.splice(idx, 1);
  setDraftsStore(drafts);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const deleted: DeletedDiagram = {
    diagramId: diagram.diagramId,
    name: diagram.name || "Untitled",
    xml: diagram.xml || "",
    metadata: { spec: diagram.spec, createdAt: diagram.createdAt },
    deletedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const store = getDeletedStore();
  store.unshift(deleted);
  setDeletedStore(store);
}

/**
 * Restore a soft-deleted diagram: moves it from deleted_diagrams back to diagram_drafts.
 */
export function restoreDiagram(diagramId: string): void {
  const store = getDeletedStore();
  const idx = store.findIndex((d) => d.diagramId === diagramId);
  if (idx === -1) return;

  const deleted = store[idx];
  store.splice(idx, 1);
  setDeletedStore(store);

  const drafts = getDraftsStore();
  const restored: DiagramDraft = {
    diagramId: deleted.diagramId,
    name: deleted.name,
    createdAt: (deleted.metadata?.createdAt as string) || new Date().toISOString(),
    xml: deleted.xml,
    spec: deleted.metadata?.spec,
  };

  drafts.unshift(restored);
  setDraftsStore(drafts);
}

/**
 * Permanently delete a diagram from the deleted store.
 */
export function permanentlyDeleteDiagram(diagramId: string): void {
  const store = getDeletedStore();
  const filtered = store.filter((d) => d.diagramId !== diagramId);
  setDeletedStore(filtered);
}

/**
 * Remove all diagrams whose expiresAt is in the past.
 */
export function purgeExpiredDiagrams(): void {
  const store = getDeletedStore();
  const now = new Date().getTime();
  const filtered = store.filter((d) => new Date(d.expiresAt).getTime() > now);
  if (filtered.length !== store.length) {
    setDeletedStore(filtered);
  }
}

/**
 * Get all soft-deleted diagrams.
 */
export function getDeletedDiagrams(): DeletedDiagram[] {
  return getDeletedStore();
}

/**
 * Calculate remaining days until a deleted diagram expires.
 */
export function getDaysUntilExpiry(diagram: DeletedDiagram): number {
  const now = new Date().getTime();
  const expires = new Date(diagram.expiresAt).getTime();
  const diff = expires - now;
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}
