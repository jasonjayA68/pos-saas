import { AppError, type ErrorCode } from "@/lib/errors";

export type ActionError = {
  code: ErrorCode;
  message: string;
  fields?: Record<string, string[]>;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(
  code: ErrorCode,
  message: string,
  fields?: Record<string, string[]>,
): ActionResult<never> {
  return {
    ok: false,
    error: fields ? { code, message, fields } : { code, message },
  };
}

export function fromError(err: unknown): ActionResult<never> {
  if (err instanceof AppError) return fail(err.code, err.message);
  if (err instanceof Error) return fail("INTERNAL", err.message);
  return fail("INTERNAL", "Unknown error");
}
