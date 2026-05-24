"use client";

import { useRef, useState, useTransition } from "react";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  removeBusinessLogoAction,
  updateReceiptSettings,
  uploadBusinessLogoAction,
} from "@/features/settings/actions";
import type { ReceiptSettings } from "@/features/settings/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ReceiptForm({ initial }: { initial: ReceiptSettings }) {
  const [header, setHeader] = useState(initial.receiptHeader ?? "");
  const [footer, setFooter] = useState(initial.receiptFooter ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateReceiptSettings({
        receiptHeader: header,
        receiptFooter: footer,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Receipt settings saved");
    });
  };

  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.set("logo", file);
    const result = await uploadBusinessLogoAction(formData);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setLogoUrl(result.data.logoUrl);
    toast.success("Logo uploaded");
  };

  const onRemove = () => {
    startTransition(async () => {
      const result = await removeBusinessLogoAction();
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setLogoUrl(null);
      toast.success("Logo removed");
    });
  };

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Shown at the top of printed receipts. PNG, JPEG, or WEBP up to 2 MB.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white dark:border-neutral-800">
              {logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={logoUrl}
                  alt={`${initial.businessName} logo`}
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <span className="text-xs text-neutral-400">No logo</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onUpload}
                disabled={uploading || pending}
              />
              {logoUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRemove}
                  disabled={pending || uploading}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove logo
                </Button>
              ) : (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  <Upload className="mr-1 inline h-3 w-3" />
                  Upload a square image for best results.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receipt text</CardTitle>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Shown above and below the line items on every receipt.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="header">Header</Label>
            <Textarea
              id="header"
              rows={3}
              maxLength={500}
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              placeholder="e.g. 'Thank you for shopping with us!'"
              disabled={pending}
            />
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {header.length} / 500 characters
            </p>
          </div>
          <div>
            <Label htmlFor="footer">Footer</Label>
            <Textarea
              id="footer"
              rows={3}
              maxLength={500}
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              placeholder="e.g. 'No returns after 7 days. Keep your receipt.'"
              disabled={pending}
            />
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {footer.length} / 500 characters
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save receipt"}
        </Button>
      </div>
    </form>
  );
}
