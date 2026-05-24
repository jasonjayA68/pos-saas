"use client";

import { useState } from "react";
import { Keyboard } from "lucide-react";
import {
  formatHotkey,
  useHotkey,
  useShortcuts,
} from "@/lib/keyboard/use-hotkey";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// Press `?` anywhere to open a list of currently-registered keyboard
// shortcuts. Shortcuts are gathered from useHotkey() calls higher in the
// tree — empty by default, populates as pages mount.
export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const shortcuts = useShortcuts();

  useHotkey("?", () => setOpen(true), {
    description: "Show keyboard shortcuts",
    scope: "global",
    ignoreInputs: true,
  });

  const global = shortcuts.filter((s) => s.scope === "global");
  const page = shortcuts.filter((s) => s.scope === "page");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" /> Keyboard shortcuts
          </SheetTitle>
          <SheetDescription>
            Press the keys anywhere in the app. Press{" "}
            <Kbd>?</Kbd> to open this anytime.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {global.length > 0 ? (
            <Section title="Global">
              {global.map((s) => (
                <Row
                  key={s.key}
                  description={s.description}
                  hotkey={s.key}
                />
              ))}
            </Section>
          ) : null}

          {page.length > 0 ? (
            <Section title="This page">
              {page.map((s) => (
                <Row
                  key={s.key}
                  description={s.description}
                  hotkey={s.key}
                />
              ))}
            </Section>
          ) : (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No page-specific shortcuts on this screen yet.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {title}
      </h3>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function Row({
  description,
  hotkey,
}: {
  description: string;
  hotkey: string;
}) {
  return (
    <li className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900">
      <span>{description}</span>
      <Kbd>{formatHotkey(hotkey)}</Kbd>
    </li>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
      {children}
    </kbd>
  );
}
