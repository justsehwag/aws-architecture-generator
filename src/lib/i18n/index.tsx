/**
 * Internationalization (i18n) module.
 *
 * Lightweight dictionary-based approach for the MVP.
 * Supports: English (en), German (de), French (fr), Spanish (es), Japanese (ja).
 *
 * Usage:
 *   import { useTranslation } from '@/lib/i18n';
 *   const { t, locale, setLocale, locales } = useTranslation();
 *   <span>{t('nav.dashboard')}</span>
 *
 * Validates: Requirement 17.4
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import en, { type TranslationKey } from "./translations/en";
import de from "./translations/de";
import fr from "./translations/fr";
import es from "./translations/es";
import ja from "./translations/ja";

// --- Types ---

export type Locale = "en" | "de" | "fr" | "es" | "ja";

export type TranslationDictionary = Record<TranslationKey, string>;

export interface LocaleInfo {
  code: Locale;
  name: string;
  nativeName: string;
}

export interface I18nContextValue {
  /** Current active locale */
  locale: Locale;
  /** Change the active locale (persists to localStorage) */
  setLocale: (locale: Locale) => void;
  /** Translate a key, with optional interpolation params */
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  /** All supported locales with metadata */
  locales: LocaleInfo[];
}

// --- Constants ---

const LOCALE_STORAGE_KEY = "aws-arch-generator-locale";

const DEFAULT_LOCALE: Locale = "en";

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
];

const TRANSLATIONS: Record<Locale, TranslationDictionary> = {
  en: en as TranslationDictionary,
  de: de as TranslationDictionary,
  fr: fr as TranslationDictionary,
  es: es as TranslationDictionary,
  ja: ja as TranslationDictionary,
};

// --- Helpers ---

/**
 * Load saved locale from localStorage, falling back to browser language or default.
 */
function getInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  // Check localStorage
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isValidLocale(stored)) {
      return stored;
    }
  } catch {
    // localStorage may be unavailable
  }

  // Check browser language
  const browserLang = navigator.language?.split("-")[0];
  if (browserLang && isValidLocale(browserLang)) {
    return browserLang;
  }

  return DEFAULT_LOCALE;
}

/**
 * Type guard to check if a string is a valid supported locale.
 */
export function isValidLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.some((l) => l.code === value);
}

/**
 * Translate a key for a given locale, with optional parameter interpolation.
 * Falls back to English if the key is missing in the active locale.
 * Returns the raw key if not found in any locale.
 */
export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  const dictionary = TRANSLATIONS[locale];
  let text = dictionary?.[key] ?? TRANSLATIONS.en[key] ?? key;

  // Interpolate {param} placeholders
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replace(
        new RegExp(`\\{${paramKey}\\}`, "g"),
        String(paramValue)
      );
    }
  }

  return text;
}

// --- Context ---

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

// --- Provider ---

export interface I18nProviderProps {
  children: ReactNode;
  /** Override the initial locale (useful for testing) */
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(
    initialLocale ?? DEFAULT_LOCALE
  );
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    if (!initialLocale) {
      setLocaleState(getInitialLocale());
    }
    setMounted(true);
  }, [initialLocale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    } catch {
      // Silently fail if localStorage is unavailable
    }
    // Update the document lang attribute for accessibility
    if (typeof document !== "undefined") {
      document.documentElement.lang = newLocale;
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      // Before hydration, use default locale to avoid mismatch
      const activeLocale = mounted ? locale : DEFAULT_LOCALE;
      return translate(activeLocale, key, params);
    },
    [locale, mounted]
  );

  const value: I18nContextValue = {
    locale: mounted ? locale : DEFAULT_LOCALE,
    setLocale,
    t,
    locales: SUPPORTED_LOCALES,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// --- Hook ---

/**
 * Access the i18n context for translation and locale switching.
 *
 * @example
 * const { t, locale, setLocale } = useTranslation();
 * return <h1>{t('page.dashboard.title')}</h1>;
 */
export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}

// Re-export types for convenience
export type { TranslationKey };
