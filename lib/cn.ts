import clsx, { type ClassValue } from "clsx";

/**
 * Class-name composer for Stap primitives.
 *
 * Intentionally clsx-only (no tailwind-merge): the design system uses custom
 * font-size tokens (`text-question`, `text-eyebrow`, …) and custom utilities
 * (`surface-hero`, `border-structural`) that tailwind-merge's default config
 * does not know about, which would mis-merge them. Primitives encapsulate
 * their own typography; consumers only add spacing/layout classes, so plain
 * concatenation is safe. If a real conflict surface appears later, switch to
 * `extendTailwindMerge` with the custom scale registered.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
