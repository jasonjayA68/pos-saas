"use client";

import { useEffect } from "react";

// Last-resort error boundary: catches errors thrown by the root layout
// itself (since regular error.tsx files run *inside* layouts). Must
// include <html> and <body> because at this point the normal layout
// has been replaced. Keep it dependency-light — pulling in heavy UI
// might crash again on the same root issue.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fafafa",
          color: "#171717",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <main
          role="alert"
          style={{
            maxWidth: 480,
            padding: 32,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#dc2626",
              marginBottom: 12,
            }}
          >
            Application error
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>
            Something broke at the root
          </h1>
          <p style={{ color: "#525252", marginBottom: 24, lineHeight: 1.5 }}>
            We&apos;re showing this minimal screen because the app shell itself
            failed to render. Try again or reload — if it keeps happening,
            contact support with the reference below.
          </p>
          {error.digest ? (
            <pre
              style={{
                fontSize: 12,
                color: "#737373",
                background: "#f5f5f5",
                padding: "8px 12px",
                borderRadius: 6,
                marginBottom: 24,
                display: "inline-block",
              }}
            >
              ref: {error.digest}
            </pre>
          ) : null}
          <div
            style={{ display: "flex", gap: 8, justifyContent: "center" }}
          >
            <button
              onClick={reset}
              style={{
                padding: "8px 16px",
                background: "#171717",
                color: "#fff",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: "8px 16px",
                background: "#fff",
                color: "#171717",
                borderRadius: 6,
                border: "1px solid #e5e5e5",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Go home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
