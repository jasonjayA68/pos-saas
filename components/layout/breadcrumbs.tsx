"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getNavLabelForPath } from "./nav-items";

function humanize(segment: string): string {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    const label =
      idx === 0
        ? getNavLabelForPath(href) ?? humanize(segment)
        : humanize(segment);
    return { href, label, isLast: idx === segments.length - 1 };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm">
      <ol className="flex items-center gap-1">
        {crumbs.map((c, i) => (
          <li key={c.href} className="flex items-center gap-1">
            {i > 0 ? (
              <ChevronRight className="h-4 w-4 text-neutral-400 dark:text-neutral-600" />
            ) : null}
            {c.isLast ? (
              <span className="font-medium text-neutral-900 dark:text-neutral-50">
                {c.label}
              </span>
            ) : (
              <Link
                href={c.href}
                className="text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
              >
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
