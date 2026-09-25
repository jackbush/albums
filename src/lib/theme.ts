import type { Theme } from './schema';

export const DEFAULT_BODY_FONT = 'IBM Plex Sans';
export const DEFAULT_HEADING_FONT = 'IBM Plex Serif';

const DEFAULTS = {
  background: '#fafafa',
  textLink: '#0000ff',
  textPrimary: '#222222',
  textSecondary: '#444444',
} as const;

const BODY_STACK = `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`;
const HEADING_STACK = `Georgia, 'Times New Roman', serif`;

/** Fonts we ship ourselves; anything else is fetched from Google Fonts. */
const SELF_HOSTED = new Set([DEFAULT_BODY_FONT, DEFAULT_HEADING_FONT]);

export interface ResolvedTheme {
  /** CSS custom properties to apply to the page. */
  vars: Record<string, string>;
  /** Google Fonts families this page needs loading, empty when using the defaults. */
  googleFonts: string[];
}

/**
 * Merges a manifest `theme` block over the defaults.
 *
 * One fallback rule, and this is the only place it lives:
 *   textTitle -> textPrimary
 */
export function resolveTheme(theme?: Theme): ResolvedTheme {
  const background = theme?.background ?? DEFAULTS.background;
  const textPrimary = theme?.textPrimary ?? DEFAULTS.textPrimary;
  const textSecondary = theme?.textSecondary ?? DEFAULTS.textSecondary;
  const textTitle = theme?.textTitle ?? textPrimary;
  const textLink = theme?.textLink ?? DEFAULTS.textLink;

  const bodyFont = theme?.fontBody ?? DEFAULT_BODY_FONT;
  const headingFont = theme?.fontHeading ?? DEFAULT_HEADING_FONT;

  const googleFonts = [bodyFont, headingFont].filter(
    (family, i, all) => !SELF_HOSTED.has(family) && all.indexOf(family) === i,
  );

  return {
    vars: {
      '--bg': background,
      '--text-primary': textPrimary,
      '--text-secondary': textSecondary,
      '--text-title': textTitle,
      '--text-link': textLink,
      '--font-body': `'${bodyFont}', ${BODY_STACK}`,
      '--font-heading': `'${headingFont}', ${HEADING_STACK}`,
    },
    googleFonts,
  };
}

/** Builds the Google Fonts stylesheet URL for the given families, or null if none are needed. */
export function googleFontsHref(families: string[]): string | null {
  if (families.length === 0) return null;
  const params = families
    // Ask for a usable weight range; Google ignores axes a family doesn't have.
    .map((family) => `family=${encodeURIComponent(family)}:wght@400;500;600;700`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/** Serialises resolved vars into an inline `style` attribute value. */
export function varsToStyle(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([key, value]) => `${key}:${value}`)
    .join(';');
}
