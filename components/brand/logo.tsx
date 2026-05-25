import { cn } from "@/lib/utils";

// Vendora brand mark — inline SVG approximation of the uploaded logo
// (navy cloud outline + three ascending teal→blue→navy bars).
//
// Why SVG instead of <img src="/logo.png">:
//   - colors inherit from CSS variables, so the mark recolors itself
//     in dark mode without shipping two images
//   - no layout shift while loading, no extra HTTP request
//   - razor-crisp at every size (16px sidebar icon → 96px login splash)
//
// If you'd rather use the original PNG, drop it at `public/logo.png`
// and swap the SVG below for `<Image src="/logo.png" alt="Vendora" … />`.
type SizeKey = "xs" | "sm" | "md" | "lg" | "xl";

const MARK_SIZE: Record<SizeKey, string> = {
  xs: "h-5 w-5",
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-12 w-12",
  xl: "h-20 w-20",
};

const TEXT_SIZE: Record<SizeKey, string> = {
  xs: "text-sm",
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-4xl",
};

export function LogoMark({
  size = "md",
  className,
}: {
  size?: SizeKey;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Vendora"
      className={cn(MARK_SIZE[size], className)}
    >
      {/* Cloud outline — single closed path, two bumps + flat base. */}
      <path
        d="M22 60 Q12 60 14 50 Q16 40 28 40 Q32 26 48 28 Q66 26 70 42 Q86 42 84 56 Q86 66 76 66 L26 66 Q22 66 22 60 Z"
        stroke="var(--brand-primary)"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="white"
        className="dark:fill-neutral-950"
      />
      {/* Three ascending bars — short teal, medium blue, tall navy. */}
      <rect x="38" y="51" width="6" height="11" rx="1" fill="var(--brand-teal)" />
      <rect x="47" y="44" width="6" height="18" rx="1" fill="var(--brand-accent)" />
      <rect x="56" y="36" width="6" height="26" rx="1" fill="var(--brand-primary)" />
    </svg>
  );
}

// Full logo with wordmark — for login splashes and sidebar headers.
// `tone="muted"` darkens the wordmark on light backgrounds where the
// brand navy is too bold (admin top-bar, faded states).
export function Logo({
  size = "md",
  showWordmark = true,
  tone = "brand",
  className,
}: {
  size?: SizeKey;
  showWordmark?: boolean;
  tone?: "brand" | "muted" | "inverse";
  className?: string;
}) {
  const wordmarkColor =
    tone === "inverse"
      ? "text-white"
      : tone === "muted"
        ? "text-neutral-900 dark:text-neutral-100"
        : "text-[var(--brand-primary)]";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {showWordmark ? (
        <span
          className={cn(
            "font-semibold tracking-tight",
            TEXT_SIZE[size],
            wordmarkColor,
          )}
        >
          Vendora
        </span>
      ) : null}
    </span>
  );
}
