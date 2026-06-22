"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [light, setLight] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      onClick={toggle}
      title={light ? "Switch to dark mode" : "Switch to light mode"}
      aria-label="Toggle color theme"
      className="w-9 h-9 grid place-items-center rounded-lg text-base text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
    >
      {/* Render a stable icon until mounted to avoid hydration mismatch */}
      {mounted ? (light ? "🌙" : "☀️") : "🌓"}
    </button>
  );
}
