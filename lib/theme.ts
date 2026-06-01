// Stap theme model. Three user preferences (system / light / dark) collapse
// into two resolved values (light / dark). Dark mode is opt-in and driven by
// the `data-theme` attribute on <html>, set by the FOUC-prevention script in
// the root layout and kept in sync by the theme provider.

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "stap-theme";
export const THEME_ATTRIBUTE = "data-theme";

export function isValidPreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

/**
 * Inline script body — runs synchronously in <head> before hydration to set
 * the `data-theme` attribute and avoid a light/dark flash on first paint.
 * Kept as a constant string so it can be injected via dangerouslySetInnerHTML.
 */
export const themeBootstrapScript = `
(function(){try{
var k=${JSON.stringify(THEME_STORAGE_KEY)};
var raw=localStorage.getItem(k);
var pref=(raw==="dark"||raw==="light"||raw==="system")?raw:"system";
var dark=pref==="dark"||(pref==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
if(dark)document.documentElement.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)},"dark");
else document.documentElement.removeAttribute(${JSON.stringify(THEME_ATTRIBUTE)});
}catch(e){}})();
`.trim();
