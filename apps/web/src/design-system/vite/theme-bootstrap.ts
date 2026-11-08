import type { Plugin } from "vite";

const SCRIPT = `(function(){try{var s=localStorage.getItem('theme');var t=s||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=d?'dark':'light';document.documentElement.classList.add(r);document.documentElement.style.colorScheme=r;}catch(e){}})();`;

/**
 * Injects a synchronous pre-paint script into <head> so the resolved theme
 * class and `color-scheme` are on <html> before CSS evaluates. Without this,
 * Vite apps flash light on first paint when the OS prefers dark, because
 * next-themes only resolves `system` after React mounts.
 *
 * Mirrors the defaults of <ThemeProvider> in
 * packages/ui/design-system/src/providers/theme.tsx (storageKey "theme",
 * defaultTheme "system", attribute "class"). Keep in sync.
 *
 * @returns Vite plugin that prepends the bootstrap script to the document head.
 */
export const themeBootstrap = (): Plugin => ({
  name: "design-system:theme-bootstrap",
  transformIndexHtml: () => [
    {
      tag: "script",
      children: SCRIPT,
      injectTo: "head-prepend",
    },
  ],
});
