"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Documents" },
  { href: "/topics", label: "Workspaces" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex gap-1">
      {LINKS.map(({ href, label }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              active
                ? "bg-raised text-text"
                : "text-muted hover:bg-raised hover:text-text"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
