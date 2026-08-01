import { describe, it, expect } from "vitest";
import { translate, isValidLocale, SUPPORTED_LOCALES } from "./index";
import en, { type TranslationKey } from "./translations/en";
import de from "./translations/de";
import fr from "./translations/fr";
import es from "./translations/es";
import ja from "./translations/ja";

describe("i18n", () => {
  describe("isValidLocale", () => {
    it("returns true for supported locales", () => {
      expect(isValidLocale("en")).toBe(true);
      expect(isValidLocale("de")).toBe(true);
      expect(isValidLocale("fr")).toBe(true);
      expect(isValidLocale("es")).toBe(true);
      expect(isValidLocale("ja")).toBe(true);
    });

    it("returns false for unsupported locales", () => {
      expect(isValidLocale("zh")).toBe(false);
      expect(isValidLocale("")).toBe(false);
      expect(isValidLocale("invalid")).toBe(false);
    });
  });

  describe("SUPPORTED_LOCALES", () => {
    it("contains exactly 5 locales", () => {
      expect(SUPPORTED_LOCALES).toHaveLength(5);
    });

    it("each locale has code, name, and nativeName", () => {
      for (const locale of SUPPORTED_LOCALES) {
        expect(locale.code).toBeTruthy();
        expect(locale.name).toBeTruthy();
        expect(locale.nativeName).toBeTruthy();
      }
    });
  });

  describe("translate", () => {
    it("returns the correct English translation", () => {
      expect(translate("en", "nav.dashboard")).toBe("Dashboard");
      expect(translate("en", "action.generate")).toBe("Generate");
      expect(translate("en", "status.loading")).toBe("Loading");
    });

    it("returns the correct German translation", () => {
      expect(translate("de", "nav.dashboard")).toBe("Übersicht");
      expect(translate("de", "action.generate")).toBe("Generieren");
      expect(translate("de", "status.loading")).toBe("Laden");
    });

    it("returns the correct French translation", () => {
      expect(translate("fr", "nav.dashboard")).toBe("Tableau de bord");
      expect(translate("fr", "action.generate")).toBe("Générer");
    });

    it("returns the correct Spanish translation", () => {
      expect(translate("es", "nav.dashboard")).toBe("Panel");
      expect(translate("es", "action.generate")).toBe("Generar");
    });

    it("returns the correct Japanese translation", () => {
      expect(translate("ja", "nav.dashboard")).toBe("ダッシュボード");
      expect(translate("ja", "action.generate")).toBe("生成");
    });

    it("interpolates parameters correctly", () => {
      expect(
        translate("en", "prompt.charCount", { count: "42", max: "5000" })
      ).toBe("42 / 5000 characters");
      expect(
        translate("de", "prompt.charCount", { count: "42", max: "5000" })
      ).toBe("42 / 5000 Zeichen");
      expect(
        translate("ja", "prompt.charCount", { count: "42", max: "5000" })
      ).toBe("42 / 5000 文字");
    });
  });

  describe("translation completeness", () => {
    const enKeys = Object.keys(en) as TranslationKey[];

    it("all locales have the same keys as English", () => {
      const localeFiles = { de, fr, es, ja };
      for (const [localeName, translations] of Object.entries(localeFiles)) {
        const localeKeys = Object.keys(translations);
        const missingKeys = enKeys.filter(
          (key) => !localeKeys.includes(key)
        );
        expect(
          missingKeys,
          `Locale "${localeName}" is missing keys: ${missingKeys.join(", ")}`
        ).toHaveLength(0);
      }
    });

    it("no locale has extra keys not in English", () => {
      const localeFiles = { de, fr, es, ja };
      for (const [localeName, translations] of Object.entries(localeFiles)) {
        const localeKeys = Object.keys(translations);
        const extraKeys = localeKeys.filter(
          (key) => !enKeys.includes(key as TranslationKey)
        );
        expect(
          extraKeys,
          `Locale "${localeName}" has extra keys: ${extraKeys.join(", ")}`
        ).toHaveLength(0);
      }
    });

    it("no translation value is empty", () => {
      const allLocales = { en, de, fr, es, ja };
      for (const [localeName, translations] of Object.entries(allLocales)) {
        for (const [key, value] of Object.entries(translations)) {
          expect(
            value.trim().length,
            `Locale "${localeName}" has empty value for key "${key}"`
          ).toBeGreaterThan(0);
        }
      }
    });
  });
});
