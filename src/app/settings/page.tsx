"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n";

// --- Constants ---

const AWS_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-east-2", label: "US East (Ohio)" },
  { value: "us-west-1", label: "US West (N. California)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "eu-west-1", label: "Europe (Ireland)" },
  { value: "eu-west-2", label: "Europe (London)" },
  { value: "eu-central-1", label: "Europe (Frankfurt)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
  { value: "sa-east-1", label: "South America (São Paulo)" },
] as const;

const LLM_MODELS = [
  { value: "openai-gpt-4o", label: "OpenAI GPT-4o" },
  { value: "claude-sonnet", label: "Claude Sonnet" },
] as const;

const KEYBOARD_SHORTCUTS = [
  { keys: "Ctrl+Z", description: "Undo last action" },
  { keys: "Ctrl+Y", description: "Redo last action" },
  { keys: "Delete", description: "Delete selected node" },
  { keys: "Ctrl+S", description: "Save diagram" },
  { keys: "Ctrl+E", description: "Export diagram" },
  { keys: "Ctrl++", description: "Zoom in" },
  { keys: "Ctrl+-", description: "Zoom out" },
  { keys: "Ctrl+0", description: "Reset zoom" },
  { keys: "Escape", description: "Cancel current action" },
  { keys: "Tab", description: "Navigate to next element" },
  { keys: "Shift+Tab", description: "Navigate to previous element" },
  { keys: "Enter", description: "Confirm / Activate" },
] as const;

const SETTINGS_STORAGE_KEY = "aws-arch-generator-settings";

// --- Types ---

interface AppSettings {
  defaultRegion: string;
  llmModel: string;
}

// --- Helpers ---

function loadSettings(): AppSettings {
  if (typeof window === "undefined") {
    return { defaultRegion: "us-east-1", llmModel: "openai-gpt-4o" };
  }
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as AppSettings;
    }
  } catch {
    // Ignore parse errors, return defaults
  }
  return { defaultRegion: "us-east-1", llmModel: "openai-gpt-4o" };
}

function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Settings page.
 *
 * Provides user preference controls:
 * - Theme selection (Light/Dark/System) via next-themes
 * - Default AWS region dropdown
 * - LLM model selection
 * - Keyboard shortcuts reference (read-only)
 *
 * Settings are persisted in localStorage for the MVP.
 *
 * Validates: Requirement 11.5
 */
export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, locales } = useTranslation();
  const [settings, setSettings] = React.useState<AppSettings>(loadSettings);
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch with theme
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your application preferences.
        </p>
      </div>

      {/* Theme Selection */}
      <section
        className="space-y-4 rounded-lg border border-border p-6"
        aria-labelledby="theme-heading"
      >
        <h2
          id="theme-heading"
          className="text-lg font-semibold text-foreground"
        >
          Appearance
        </h2>
        <div className="grid gap-2">
          <Label htmlFor="theme-select">Theme</Label>
          {mounted && (
            <Select value={theme ?? "system"} onValueChange={setTheme}>
              <SelectTrigger id="theme-select" className="w-full max-w-xs">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          )}
          <p className="text-xs text-muted-foreground">
            Choose how the application looks. System follows your OS
            preference.
          </p>
        </div>
      </section>

      {/* Language Selection */}
      <section
        className="space-y-4 rounded-lg border border-border p-6"
        aria-labelledby="language-heading"
      >
        <h2
          id="language-heading"
          className="text-lg font-semibold text-foreground"
        >
          Language
        </h2>
        <div className="grid gap-2">
          <Label htmlFor="language-select">Display Language</Label>
          {mounted && (
            <Select value={locale} onValueChange={(value) => setLocale(value as typeof locale)}>
              <SelectTrigger id="language-select" className="w-full max-w-xs">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {locales.map((loc) => (
                  <SelectItem key={loc.code} value={loc.code}>
                    {loc.nativeName} ({loc.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-xs text-muted-foreground">
            Select the display language for the application interface.
          </p>
        </div>
      </section>

      {/* Default AWS Region */}
      <section
        className="space-y-4 rounded-lg border border-border p-6"
        aria-labelledby="region-heading"
      >
        <h2
          id="region-heading"
          className="text-lg font-semibold text-foreground"
        >
          Default AWS Region
        </h2>
        <div className="grid gap-2">
          <Label htmlFor="region-select">Region</Label>
          <Select
            value={settings.defaultRegion}
            onValueChange={(value) => updateSetting("defaultRegion", value)}
          >
            <SelectTrigger id="region-select" className="w-full max-w-xs">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              {AWS_REGIONS.map((region) => (
                <SelectItem key={region.value} value={region.value}>
                  {region.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The default region used when generating new architecture diagrams.
          </p>
        </div>
      </section>

      {/* LLM Model Selection */}
      <section
        className="space-y-4 rounded-lg border border-border p-6"
        aria-labelledby="model-heading"
      >
        <h2
          id="model-heading"
          className="text-lg font-semibold text-foreground"
        >
          LLM Model
        </h2>
        <div className="grid gap-2">
          <Label htmlFor="model-select">Model</Label>
          <Select
            value={settings.llmModel}
            onValueChange={(value) => updateSetting("llmModel", value)}
          >
            <SelectTrigger id="model-select" className="w-full max-w-xs">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {LLM_MODELS.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The AI model used to interpret prompts and generate architecture
            specifications.
          </p>
        </div>
      </section>

      {/* Keyboard Shortcuts Reference */}
      <section
        className="space-y-4 rounded-lg border border-border p-6"
        aria-labelledby="shortcuts-heading"
      >
        <h2
          id="shortcuts-heading"
          className="text-lg font-semibold text-foreground"
        >
          Keyboard Shortcuts
        </h2>
        <p className="text-sm text-muted-foreground">
          Reference for available keyboard shortcuts in the diagram editor.
        </p>
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm" aria-label="Keyboard shortcuts">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium text-foreground">
                  Shortcut
                </th>
                <th className="px-4 py-2 text-left font-medium text-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {KEYBOARD_SHORTCUTS.map((shortcut) => (
                <tr
                  key={shortcut.keys}
                  className="border-b last:border-b-0"
                >
                  <td className="px-4 py-2">
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                      {shortcut.keys}
                    </kbd>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {shortcut.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
