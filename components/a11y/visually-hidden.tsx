import type { ReactNode } from "react";

// Screen-reader-only text. Use to label icon-only buttons:
//   <button>
//     <Search />
//     <VisuallyHidden>Search products</VisuallyHidden>
//   </button>
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
