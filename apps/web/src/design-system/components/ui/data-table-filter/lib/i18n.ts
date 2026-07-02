import en from "../locales/en.json";

export type Locale = "en";

type Translations = Record<string, string>;

const translations: Record<Locale, Translations> = {
  en,
};

/**
 * Resolves a translation string for a key in the given locale.
 *
 * @param key - The translation key to look up.
 * @param locale - The locale to resolve against.
 * @returns The translated string, or `key` itself when no translation exists.
 */
export function t(key: string, locale: Locale): string {
  return translations[locale][key] ?? key;
}
