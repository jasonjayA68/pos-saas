import { randomBytes } from "node:crypto";

export function generateSku(name: string): string {
  const prefix =
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6) || "PROD";
  const suffix = randomBytes(2).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}
