import { getInitialPreferences, usePreferences } from "./usePreferences";

export type Theme = "dark" | "light";

export function getInitialTheme(): Theme {
  return getInitialPreferences().theme;
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
}

export function useTheme() {
  const { prefs, update } = usePreferences();
  const theme = prefs.theme;
  const setTheme = (t: Theme) => update({ theme: t });
  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, setTheme, toggle };
}
