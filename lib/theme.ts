const THEME_KEY = "cms-theme";
export type Theme = "dark" | "light";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  // No saved preference — fall back to the data-theme the flash script applied
  // from SiteConfig.defaultTheme, so the toggle reflects the site default.
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" || attr === "light" ? attr : "light";
}

export function setTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
}

export function toggleTheme(): Theme {
  const next = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

/** Inline script string — injected before first paint to prevent theme flash */
export const THEME_FLASH_PREVENTION_SCRIPT = `
(function(){
  try{
    var t=localStorage.getItem('cms-theme')||'light';
    document.documentElement.setAttribute('data-theme',t);
  }catch(e){}
})();
`.trim();
