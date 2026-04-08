const THEME_KEY = "theme";
const LAST_NON_DARK_KEY = "theme.lastNonDark";

export const THEMES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
  { id: "purple", label: "Purple" },
  { id: "red", label: "Red" },
  { id: "orange", label: "Orange" },
  { id: "teal", label: "Teal" },
  { id: "pink", label: "Pink" },
  { id: "indigo", label: "Indigo" },
  { id: "yellow", label: "Yellow" },
  { id: "cyan", label: "Cyan" }
];

const THEME_IDS = new Set(THEMES.map((t) => t.id));

export function getStoredTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v && THEME_IDS.has(v)) return v;

    // Back-compat: older versions stored only light/dark
    if (v === "dark" || v === "light") return v;
  } catch {
    // ignore
  }
  return null;
}

export function applyTheme(themeId) {
  const t = THEME_IDS.has(themeId) ? themeId : "light";
  const root = document.documentElement;

  // Enable smooth transitions for theme switching.
  root.classList.add("theme-smooth");

  root.dataset.theme = t;
  if (t === "dark") root.classList.add("dark");
  else root.classList.remove("dark");

  return t;
}

export function setTheme(themeId) {
  const t = applyTheme(themeId);
  try {
    localStorage.setItem(THEME_KEY, t);
    if (t !== "dark") {
      localStorage.setItem(LAST_NON_DARK_KEY, t);
    }
  } catch {
    // ignore
  }
  return t;
}

export function initTheme() {
  const stored = getStoredTheme();
  applyTheme(stored || "light");
}

export function toggleTheme() {
  const current = document.documentElement.dataset.theme || (document.documentElement.classList.contains("dark") ? "dark" : "light");
  if (current === "dark") {
    let restore = "light";
    try {
      const v = localStorage.getItem(LAST_NON_DARK_KEY);
      if (v && THEME_IDS.has(v) && v !== "dark") {
        restore = v;
      }
    } catch {
      // ignore
    }
    return setTheme(restore);
  }

  // Remember the current theme as the non-dark theme, then switch to dark.
  try {
    localStorage.setItem(LAST_NON_DARK_KEY, String(current || "light"));
  } catch {
    // ignore
  }
  return setTheme("dark");
}