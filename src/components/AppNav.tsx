"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LANG_LIST, SKILLS, isLang } from "@/lib/languages";

export function AppNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const lang = params.get("lang");
  const activeLang = lang && isLang(lang) ? lang : "es";

  const nav = [
    { href: "/", label: "Dashboard", icon: "🏠" },
    ...SKILLS.map((s) => ({ href: `/${s.key}`, label: s.label, icon: s.icon })),
    { href: "/lessons", label: "Lessons", icon: "📚" },
  ];

  const withLang = (href: string) => `${href}?lang=${activeLang}`;

  return (
    <header className="sticky top-0 z-10 backdrop-blur bg-background/80 border-b border-border">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14 gap-4">
        <Link href={withLang("/")} className="font-semibold text-lg tracking-tight shrink-0">
          <span className="text-brand">Go</span> Talk
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {nav.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={withLang(item.href)}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  active ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 shrink-0">
          {LANG_LIST.map((l) => {
            const href = `${pathname}?lang=${l.code}`;
            const active = activeLang === l.code;
            return (
              <Link
                key={l.code}
                href={href}
                title={l.endonym}
                className={`w-9 h-9 grid place-items-center rounded-lg text-lg transition-all ${
                  active
                    ? "bg-surface-2 ring-2 ring-brand scale-105"
                    : "opacity-50 hover:opacity-100"
                }`}
              >
                {l.flag}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
