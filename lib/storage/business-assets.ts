import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";

// Public buckets — these assets render on receipts and profile chips.
// Per-tenant scoping is enforced by writing under `{businessId}/…` or
// `{userId}/…` and re-checking auth in the upload action.
export const BUSINESS_LOGOS_BUCKET = "business-logos";
export const USER_AVATARS_BUCKET = "user-avatars";

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-128) || "file";
}

export async function uploadBusinessLogo({
  businessId,
  filename,
  contentType,
  body,
}: {
  businessId: string;
  filename: string;
  contentType: string;
  body: Buffer | Blob | ArrayBuffer;
}): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const path = `${businessId}/${Date.now()}-${sanitizeFilename(filename)}`;
  const { error } = await supabase.storage
    .from(BUSINESS_LOGOS_BUCKET)
    .upload(path, body as Blob, { contentType, upsert: false });
  if (error) {
    throw new AppError("INTERNAL", `Logo upload failed: ${error.message}`);
  }
  const { data } = supabase.storage
    .from(BUSINESS_LOGOS_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadUserAvatar({
  userId,
  filename,
  contentType,
  body,
}: {
  userId: string;
  filename: string;
  contentType: string;
  body: Buffer | Blob | ArrayBuffer;
}): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const path = `${userId}/${Date.now()}-${sanitizeFilename(filename)}`;
  const { error } = await supabase.storage
    .from(USER_AVATARS_BUCKET)
    .upload(path, body as Blob, { contentType, upsert: false });
  if (error) {
    throw new AppError("INTERNAL", `Avatar upload failed: ${error.message}`);
  }
  const { data } = supabase.storage
    .from(USER_AVATARS_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}
