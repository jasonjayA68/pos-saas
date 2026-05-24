"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

// Lightweight keyboard-shortcut system.
//
// - <HotkeyProvider> at the top of the app tracks all registered shortcuts
//   for the help dialog (press `?`).
// - useHotkey("ctrl+k", handler, {description}) binds a key and registers
//   its description so it surfaces in the help dialog.
// - Shortcuts are no-ops when the user is typing in an input/textarea,
//   unless the shortcut uses a modifier (ctrl/cmd/alt) — then they fire
//   everywhere so palette-style combos still work.

type Shortcut = {
  key: string;
  description: string;
  scope: "global" | "page";
};

type Ctx = {
  shortcuts: Shortcut[];
  register: (s: Shortcut) => () => void;
};

const HotkeyContext = createContext<Ctx | null>(null);

export function HotkeyProvider({ children }: { children: ReactNode }) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);

  const register = useCallback((s: Shortcut) => {
    setShortcuts((prev) =>
      prev.some((p) => p.key === s.key) ? prev : [...prev, s],
    );
    return () => {
      setShortcuts((prev) => prev.filter((p) => p.key !== s.key));
    };
  }, []);

  const value = useMemo<Ctx>(
    () => ({ shortcuts, register }),
    [shortcuts, register],
  );

  return (
    <HotkeyContext.Provider value={value}>{children}</HotkeyContext.Provider>
  );
}

export function useShortcuts(): Shortcut[] {
  return useContext(HotkeyContext)?.shortcuts ?? [];
}

type Options = {
  description?: string;
  enabled?: boolean;
  scope?: "global" | "page";
  // If false, the shortcut fires inside inputs/textareas too. Default: true.
  ignoreInputs?: boolean;
};

export function useHotkey(
  hotkey: string,
  handler: (event: KeyboardEvent) => void,
  options: Options = {},
) {
  // Pull `register` off the context — it's a stable useCallback([]). Depending
  // on the whole `ctx` object would re-run the effect on every shortcut change
  // (because the provider's `value` memo recreates), causing register/unregister
  // to ping-pong forever ("Maximum update depth exceeded").
  const register = useContext(HotkeyContext)?.register;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const enabled = options.enabled !== false;
  const ignoreInputs = options.ignoreInputs !== false;
  const description = options.description;
  const scope = options.scope ?? "page";

  // Register description for the help dialog.
  useEffect(() => {
    if (!enabled || !register || !description) return;
    return register({ key: hotkey, description, scope });
  }, [enabled, register, hotkey, description, scope]);

  // Bind the keydown listener.
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (!matchHotkey(event, hotkey)) return;

      const target = event.target as HTMLElement | null;
      const inField =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      const hasModifier = /(?:ctrl|cmd|meta|alt)\+/i.test(hotkey);
      if (inField && ignoreInputs && !hasModifier) return;

      event.preventDefault();
      handlerRef.current(event);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, hotkey, ignoreInputs]);
}

function matchHotkey(event: KeyboardEvent, hotkey: string): boolean {
  const parts = hotkey.toLowerCase().split("+").map((p) => p.trim());
  const target = parts.pop() ?? "";

  const needCtrl =
    parts.includes("ctrl") ||
    parts.includes("cmd") ||
    parts.includes("meta");
  const needShift = parts.includes("shift");
  const needAlt = parts.includes("alt");

  if (needCtrl !== (event.ctrlKey || event.metaKey)) return false;
  if (needAlt !== event.altKey) return false;

  const key = event.key.toLowerCase();

  // Aliases for keys that don't render literally.
  if (target === "?") {
    // `?` is shift+/ on most keyboards.
    return event.key === "?" || (key === "/" && event.shiftKey);
  }
  if (target === "space") return key === " ";
  if (target === "esc" || target === "escape") return key === "escape";
  if (target === "enter" || target === "return") return key === "enter";

  if (needShift !== event.shiftKey) return false;
  return key === target;
}

// Format a hotkey for display: "ctrl+k" → "⌃ K"
export function formatHotkey(hotkey: string): string {
  return hotkey
    .split("+")
    .map((part) => {
      const p = part.toLowerCase();
      if (p === "ctrl") return "⌃";
      if (p === "cmd" || p === "meta") return "⌘";
      if (p === "alt") return "⌥";
      if (p === "shift") return "⇧";
      if (p === "esc" || p === "escape") return "Esc";
      if (p === "enter" || p === "return") return "↵";
      if (p === "space") return "Space";
      return p.length === 1 ? p.toUpperCase() : p;
    })
    .join(" ");
}
