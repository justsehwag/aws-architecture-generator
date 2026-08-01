/**
 * useTemplates Hook
 *
 * Fetches templates from the API, provides client-side search/filter,
 * and handles loading a selected template into the diagram viewer.
 *
 * Validates: Requirements 5.2, 5.3, 5.5, 5.6
 */

"use client";

import * as React from "react";
import type { TemplateCategory, TemplateListItem } from "@/types/template";
import {
  BUILT_IN_TEMPLATES,
  type BuiltInTemplateDefinition,
} from "@/lib/templates/built-in-templates";

// --- Types ---

export type TemplateLoadStatus = "idle" | "loading" | "success" | "error";

export interface UseTemplatesState {
  /** All available templates (built-in + user custom) */
  templates: TemplateListItem[];
  /** Filtered templates based on current search/category */
  filteredTemplates: TemplateListItem[];
  /** Whether templates are being fetched */
  isLoading: boolean;
  /** Error from initial fetch */
  fetchError: string | null;
  /** Status of loading a template into viewer */
  loadStatus: TemplateLoadStatus;
  /** Error message from template load failure */
  loadError: string | null;
  /** Current search query */
  searchQuery: string;
  /** Current category filter (null = all) */
  categoryFilter: TemplateCategory | null;
}

export interface UseTemplatesReturn extends UseTemplatesState {
  /** Set search query for filtering */
  setSearchQuery: (query: string) => void;
  /** Set category filter */
  setCategoryFilter: (category: TemplateCategory | null) => void;
  /** Load a template into the diagram viewer */
  loadTemplate: (templateId: string) => Promise<string | null>;
  /** Reset load state */
  resetLoadState: () => void;
  /** Get a template by ID */
  getTemplateById: (templateId: string) => TemplateListItem | undefined;
}

// --- Helper: convert built-in definitions to list items ---

function builtInToListItem(def: BuiltInTemplateDefinition): TemplateListItem {
  return {
    templateId: def.templateId,
    name: def.name,
    description: def.description,
    category: def.category,
    useCases: def.useCases,
    isBuiltIn: true,
  };
}

// --- Helper: filter templates ---

function filterTemplates(
  templates: TemplateListItem[],
  searchQuery: string,
  categoryFilter: TemplateCategory | null
): TemplateListItem[] {
  let result = templates;

  if (categoryFilter) {
    result = result.filter((t) => t.category === categoryFilter);
  }

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    result = result.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
    );
  }

  return result;
}

// --- Hook ---

export function useTemplates(): UseTemplatesReturn {
  const [templates, setTemplates] = React.useState<TemplateListItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [loadStatus, setLoadStatus] = React.useState<TemplateLoadStatus>("idle");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] =
    React.useState<TemplateCategory | null>(null);

  // Load templates on mount
  React.useEffect(() => {
    let cancelled = false;

    async function fetchTemplates() {
      setIsLoading(true);
      setFetchError(null);

      try {
        // Try to fetch from API first
        const response = await fetch("/api/templates");

        if (!cancelled) {
          if (response.ok) {
            const data = await response.json();
            setTemplates(data.templates ?? data);
          } else {
            // Fallback to built-in templates on API failure
            setTemplates(BUILT_IN_TEMPLATES.map(builtInToListItem));
          }
        }
      } catch {
        // Fallback to built-in templates when API is unavailable
        if (!cancelled) {
          setTemplates(BUILT_IN_TEMPLATES.map(builtInToListItem));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchTemplates();

    return () => {
      cancelled = true;
    };
  }, []);

  // Compute filtered templates
  const filteredTemplates = React.useMemo(
    () => filterTemplates(templates, searchQuery, categoryFilter),
    [templates, searchQuery, categoryFilter]
  );

  // Load a template into the diagram viewer
  const loadTemplate = React.useCallback(
    async (templateId: string): Promise<string | null> => {
      setLoadStatus("loading");
      setLoadError(null);

      try {
        const response = await fetch(`/api/templates/${templateId}/load`, {
          method: "POST",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const message =
            errorData?.message ??
            `Failed to load template (${response.status})`;
          setLoadStatus("error");
          setLoadError(message);
          return null;
        }

        const data = await response.json();
        setLoadStatus("success");
        return data.diagramId ?? templateId;
      } catch {
        setLoadStatus("error");
        setLoadError(
          "Unable to load the template. Please check your connection and try again."
        );
        return null;
      }
    },
    []
  );

  const resetLoadState = React.useCallback(() => {
    setLoadStatus("idle");
    setLoadError(null);
  }, []);

  const getTemplateById = React.useCallback(
    (templateId: string): TemplateListItem | undefined => {
      return templates.find((t) => t.templateId === templateId);
    },
    [templates]
  );

  return {
    templates,
    filteredTemplates,
    isLoading,
    fetchError,
    loadStatus,
    loadError,
    searchQuery,
    categoryFilter,
    setSearchQuery,
    setCategoryFilter,
    loadTemplate,
    resetLoadState,
    getTemplateById,
  };
}
