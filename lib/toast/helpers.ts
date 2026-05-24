import { toast } from "sonner";
import type { ActionResult } from "@/lib/api/response";

// Wraps a Server Action call with consistent UX:
//   - shows a loading toast while pending
//   - on success → success toast with message (or message(data))
//   - on failure → error toast using the ActionError message
//
// Returns the original ActionResult so callers can branch and update
// local state in the same flow as before.
//
//   const result = await toastAction(
//     () => deleteProduct({ id }),
//     {
//       loading: "Deleting product…",
//       success: "Product deleted",
//       error: "Couldn't delete product",
//     },
//   );
//   if (!result.ok) return;
//   // ...optimistic cleanup
export async function toastAction<T>(
  action: () => Promise<ActionResult<T>>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error?: string;
  },
): Promise<ActionResult<T>> {
  const id = toast.loading(messages.loading);
  try {
    const result = await action();
    if (result.ok) {
      const successMsg =
        typeof messages.success === "function"
          ? messages.success(result.data)
          : messages.success;
      toast.success(successMsg, { id });
    } else {
      toast.error(result.error.message || messages.error || "Something went wrong", {
        id,
      });
    }
    return result;
  } catch (err) {
    toast.error(
      messages.error || (err instanceof Error ? err.message : "Unexpected error"),
      { id },
    );
    throw err;
  }
}

// Quick wrapper around `toast.promise` for raw promises that don't return
// ActionResult — useful for fetch() or third-party SDK calls.
export function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error?: string | ((err: unknown) => string);
  },
): Promise<T> {
  toast.promise(promise, messages);
  return promise;
}
