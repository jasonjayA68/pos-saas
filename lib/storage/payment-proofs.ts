import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";

// Private bucket — proofs are only viewable via short-lived signed URLs minted
// from server actions / route handlers. Never link the storage path to the
// browser directly; multi-tenant isolation depends on this.
export const PAYMENT_PROOFS_BUCKET = "payment-proofs";

// Public bucket — QR images set by the platform admin. Safe to expose.
export const BILLING_ASSETS_BUCKET = "billing-assets";

export const ALLOWED_PROOF_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB

type UploadProofArgs = {
  businessId: string;
  paymentId: string;
  filename: string;
  contentType: string;
  body: Buffer | Blob | ArrayBuffer;
};

export async function uploadPaymentProof({
  businessId,
  paymentId,
  filename,
  contentType,
  body,
}: UploadProofArgs): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-128);
  const path = `${businessId}/${paymentId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .upload(path, body as Blob, { contentType, upsert: false });

  if (error) {
    throw new AppError(
      "INTERNAL",
      `Payment proof upload failed: ${error.message}`,
    );
  }
  return path;
}

export async function getSignedProofUrl(
  storagePath: string,
  expiresInSeconds = 60 * 30,
): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new AppError(
      "INTERNAL",
      `Failed to sign proof URL: ${error?.message ?? "unknown error"}`,
    );
  }
  return data.signedUrl;
}

type UploadAssetArgs = {
  kind: "gcash-qr" | "maya-qr";
  filename: string;
  contentType: string;
  body: Buffer | Blob | ArrayBuffer;
};

export async function uploadBillingAsset({
  kind,
  filename,
  contentType,
  body,
}: UploadAssetArgs): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-128);
  const path = `${kind}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(BILLING_ASSETS_BUCKET)
    .upload(path, body as Blob, { contentType, upsert: false });
  if (error) {
    throw new AppError(
      "INTERNAL",
      `Asset upload failed: ${error.message}`,
    );
  }
  const { data } = supabase.storage.from(BILLING_ASSETS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
