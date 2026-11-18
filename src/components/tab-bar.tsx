"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const tabs = [
  { href: "/", label: "Today", icon: <><circle cx="12" cy="12" r="4" {...P} /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" {...P} /></> },
  { href: "/tasks", label: "Tasks", icon: <><rect x="4" y="3.5" width="16" height="17" rx="3" {...P} /><path d="M8 9l2 2 4-4M8 15.5h8" {...P} /></> },
  { href: "/money", label: "Money", icon: <><rect x="3" y="6" width="18" height="13" rx="3" {...P} /><path d="M3 10h18M16 14.5h2" {...P} /></> },
  { href: "/stats", label: "Stats", icon: <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" {...P} /> },
  { href: "/me", label: "Me", icon: <><circle cx="12" cy="8.5" r="3.5" {...P} /><path d="M5 20c1-3.5 3.8-5 7-5s6 1.5 7 5" {...P} /></> },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {tabs.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[12px] font-semibold ${active ? "text-clay-dark" : "text-muted"}`}
              >
                <span className={`grid h-7 w-12 place-items-center rounded-full ${active ? "bg-clay-soft" : ""}`}>
                  <svg viewBox="0 0 24 24" className="size-[22px]" aria-hidden>
                    {t.icon}
                  </svg>
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
