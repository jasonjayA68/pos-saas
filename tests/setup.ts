import { afterEach, vi } from "vitest";

// Global mocks — applied to every test file. Individual tests can
// override via `vi.mocked(fn).mockReturnValue(...)` after importing
// the mocked module.

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock("next/navigation", () => ({
  // `redirect()` throws a special signal in Next; tests just need to
  // detect that it was called and abort the action.
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

afterEach(() => {
  vi.clearAllMocks();
});
