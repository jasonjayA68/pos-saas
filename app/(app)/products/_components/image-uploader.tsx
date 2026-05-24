"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { ImageIcon, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { uploadProductImage } from "@/features/products/actions";
import { Button } from "@/components/ui/button";

type Props = {
  initialUrl: string;
  onChange: (url: string) => void;
};

export function ImageUploader({ initialUrl, onChange }: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [pending, startTransition] = useTransition();

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadProductImage(formData);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setUrl(result.data.url);
      onChange(result.data.url);
      toast.success("Image uploaded");
    });
  };

  const clear = () => {
    setUrl("");
    onChange("");
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Image</label>
      <div className="flex items-center gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-400">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="inline-flex">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={handleFile}
              disabled={pending}
            />
            <span className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900">
              <Upload className="mr-2 h-4 w-4" />
              {pending ? "Uploading…" : url ? "Replace" : "Upload image"}
            </span>
          </label>
          {url ? (
            <Button type="button" variant="ghost" size="sm" onClick={clear}>
              <X className="h-4 w-4" /> Remove
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        PNG or JPG, up to 4 MB.
      </p>
    </div>
  );
}
