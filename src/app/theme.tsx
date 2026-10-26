"use client";

import { Moon, Sun } from "lucide-react";
import { useLayoutEffect, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY as STORAGE_KEY, themeInitScript } from "@/lib/theme-script";

export type Theme = "light" | "dark";

// Executes on the server-rendered HTML only; the client type avoids React's script-tag warning.
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeInitScript }}
      suppressHydrationWarning
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
    />
  );
}

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

function resolveTheme(): Theme {
  return readStoredTheme() ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function getTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function ThemeSync() {
  useLayoutEffect(() => {
    // React dev remounts can reset <html> attributes set by the inline script.
    applyTheme(resolveTheme());

    const media = matchMedia("(prefers-color-scheme: dark)");
    const followSystem = () => {
      if (!readStoredTheme()) applyTheme(media.matches ? "dark" : "light");
    };
    const syncAcrossTabs = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) applyTheme(resolveTheme());
    };
    media.addEventListener("change", followSystem);
    window.addEventListener("storage", syncAcrossTabs);
    return () => {
      media.removeEventListener("change", followSystem);
      window.removeEventListener("storage", syncAcrossTabs);
    };
  }, []);

  return null;
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(subscribe, getTheme, () => "light");
  const next: Theme = theme === "dark" ? "light" : "dark";

  function toggle() {
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }

  return (
    <button
      aria-label={`Switch to ${next} theme`}
      className="theme-toggle"
      onClick={toggle}
      title={`Switch to ${next} theme`}
      type="button"
    >
      <Moon aria-hidden="true" className="theme-toggle-moon" size={17} />
      <Sun aria-hidden="true" className="theme-toggle-sun" size={17} />
    </button>
  );
}
