import "server-only";
import { AppError } from "@/lib/errors";

export type HttpRequest = {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
};

export async function http<T>(req: HttpRequest): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    req.timeoutMs ?? 10_000,
  );

  try {
    const res = await fetch(req.url, {
      method: req.method ?? "GET",
      headers: {
        "content-type": "application/json",
        ...req.headers,
      },
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new AppError(
        "INTERNAL",
        `HTTP ${res.status} ${res.statusText}: ${text.slice(0, 300)}`,
        { status: res.status },
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  } finally {
    clearTimeout(timeout);
  }
}
