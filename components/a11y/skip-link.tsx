// "Skip to main content" link — invisible until focused via Tab.
// First focusable element on the page; lets keyboard and screen-reader
// users bypass the sidebar/topbar on every navigation.
//
// Pair with <main id="main-content"> in the layout.
export function SkipLink({
  href = "#main-content",
  children = "Skip to main content",
}: {
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:bg-neutral-50 dark:focus:text-neutral-900"
    >
      {children}
    </a>
  );
}
