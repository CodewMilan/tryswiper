"use client";

import { useRef, useState } from "react";
import type { CarouselElement, Slide } from "@swiper/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { boxOf, clampBox, type Box } from "./slide-frame";

export type UploadedAsset = { id: string; url: string; width: number; height: number };

export async function uploadImage(file: File): Promise<UploadedAsset> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/v1/assets", { method: "POST", body: form });
  const body = (await response.json()) as UploadedAsset & { message?: string };
  if (!response.ok) throw new Error(body.message ?? "Upload failed.");
  return body;
}

const BOX_FIELDS: { key: keyof Box; label: string }[] = [
  { key: "x", label: "X" },
  { key: "y", label: "Y" },
  { key: "width", label: "W" },
  { key: "height", label: "H" },
];

export function Inspector({
  slide,
  element,
  canDelete,
  onText,
  onMove,
  onReplaceImage,
  onDelete,
}: {
  slide: Slide | undefined;
  element: CarouselElement | undefined;
  canDelete: boolean;
  onText: (elementId: string, text: string) => void;
  onMove: (elementId: string, box: Box) => void;
  onReplaceImage: (elementId: string, asset: UploadedAsset) => void;
  onDelete: (elementId: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!slide || !element) {
    return <p className="mt-4 text-sm text-ink-soft">Select an element on the canvas.</p>;
  }

  const box = boxOf(element);

  async function replace(file: File) {
    if (!element) return;
    setUploading(true);
    setUploadError(null);
    try {
      onReplaceImage(element.id, await uploadImage(file));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-4 space-y-5">
      <div className="space-y-2">
        <Label htmlFor="element-text">{element.role ?? element.type}</Label>
        {element.type === "text" ? (
          <Textarea
            id="element-text"
            value={element.text ?? ""}
            rows={5}
            onChange={(event) => onText(element.id, event.target.value)}
          />
        ) : (
          <p className="text-sm text-ink-soft">
            {element.src ? "Image element." : `${element.type} element.`}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-ink-faint">Position and size</p>
        <div className="grid grid-cols-4 gap-2">
          {BOX_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <Label htmlFor={`box-${key}`} className="text-xs text-ink-soft">
                {label}
              </Label>
              <Input
                id={`box-${key}`}
                type="number"
                value={box[key]}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (!Number.isFinite(value)) return;
                  onMove(element.id, clampBox({ ...box, [key]: value }));
                }}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-faint">
          Drag on the canvas, or nudge with the arrow keys. Shift moves further.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-ink-faint">Image</p>
        {element.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={element.src}
            alt=""
            className="h-24 w-full rounded-md border border-border object-cover"
          />
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void replace(file);
          }}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "Uploading…" : element.src ? "Replace image" : "Use an image here"}
        </Button>
        {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
      </div>

      <Button
        variant="ghost"
        size="sm"
        disabled={!canDelete}
        onClick={() => onDelete(element.id)}
        className="text-destructive"
      >
        Delete element
      </Button>
    </div>
  );
}
