import { describe, expect, it } from "vitest";
import { buildCsv, escapeCsvCell } from "@/lib/security/csv";
import { rateLimit } from "@/lib/security/rate-limit";

describe("escapeCsvCell — formula-injection protection", () => {
  it("passes plain strings through", () => {
    expect(escapeCsvCell("hello")).toBe("hello");
    expect(escapeCsvCell(42)).toBe("42");
  });

  it("returns empty string for null/undefined", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("neutralizes formula prefixes with a leading apostrophe", () => {
    expect(escapeCsvCell("=1+1")).toBe("'=1+1");
    expect(escapeCsvCell("+CMD()")).toBe("'+CMD()");
    expect(escapeCsvCell("-2")).toBe("'-2");
    expect(escapeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(escapeCsvCell("\tinjected")).toBe("'\tinjected");
  });

  it("quotes values containing comma / quote / newline", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('he said "hi"')).toBe('"he said ""hi"""');
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("combines formula-prefix + quoting on the same cell (the nasty case)", () => {
    // A name like `=HYPERLINK("…", "Click")` would be both formula AND
    // contain quotes — must be neutralized AND properly escaped.
    const result = escapeCsvCell('=HYPERLINK("evil","Click")');
    expect(result.startsWith('"\'=')).toBe(true);
    // Quotes inside doubled
    expect(result).toContain('""evil""');
  });
});

describe("buildCsv", () => {
  it("joins headers and rows with CRLF, escaping every cell", () => {
    const csv = buildCsv(
      ["name", "amount"],
      [
        ["Alice", 100],
        ["=cmd", "1,000"],
      ],
    );
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("name,amount");
    expect(lines[1]).toBe("Alice,100");
    // Formula prefix neutralized + comma triggers quoting
    expect(lines[2]).toBe("'=cmd,\"1,000\"");
  });
});

describe("rateLimit — sliding window", () => {
  it("allows up to the limit, denies past it", () => {
    const key = `test-limit-${Math.random()}`;
    const limit = 3;
    expect(rateLimit(key, limit, 60_000).ok).toBe(true);
    expect(rateLimit(key, limit, 60_000).ok).toBe(true);
    expect(rateLimit(key, limit, 60_000).ok).toBe(true);
    const blocked = rateLimit(key, limit, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.remaining).toBe(0);
  });

  it("decrements `remaining` accurately", () => {
    const key = `remaining-${Math.random()}`;
    expect(rateLimit(key, 5, 60_000).remaining).toBe(4);
    expect(rateLimit(key, 5, 60_000).remaining).toBe(3);
    expect(rateLimit(key, 5, 60_000).remaining).toBe(2);
  });

  it("isolates buckets by key", () => {
    const a = `bucket-a-${Math.random()}`;
    const b = `bucket-b-${Math.random()}`;
    rateLimit(a, 1, 60_000);
    // a is now full
    expect(rateLimit(a, 1, 60_000).ok).toBe(false);
    // b is unaffected
    expect(rateLimit(b, 1, 60_000).ok).toBe(true);
  });

  it("resets after the window expires", async () => {
    const key = `expiry-${Math.random()}`;
    expect(rateLimit(key, 1, 50).ok).toBe(true);
    expect(rateLimit(key, 1, 50).ok).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    expect(rateLimit(key, 1, 50).ok).toBe(true);
  });
});
