/** Default locale for field translation fallbacks (override via FormKitProvider.locale for runtime). */
export const FORM_KIT_DEFAULT_LOCALE = 'en';

/** Locales supported for field translations and runtime formatting. */
export const FORM_KIT_SUPPORTED_LOCALES = ['en', 'ne'] as const;

export type FormKitLocale = (typeof FORM_KIT_SUPPORTED_LOCALES)[number];

/** Normalize provider locale; unknown values fall back to English. */
export function resolveFormKitLocale(locale?: string | null): FormKitLocale {
  if (locale === 'ne') return 'ne';
  return FORM_KIT_DEFAULT_LOCALE;
}
