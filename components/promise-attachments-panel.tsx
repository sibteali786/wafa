"use client";

import { FileAudio, FileText, FileVideo, ImageIcon, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { MAX_ATTACHMENTS_PER_PROMISE, getAttachmentRule } from "@/lib/attachments";
import { WafaToast } from "@/components/wafa/wafa-toast";

type Attachment = {
  id: string;
  kind: "image" | "audio" | "pdf" | "video";
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

type UploadItem = {
  id: string;
  file: File;
  progress: number;
  attempts: number;
  state: "uploading" | "failed";
  error?: string;
};

type PromiseAttachmentsPanelProps = {
  promiseId: string;
  initialAttachments: Attachment[];
};

let uploadIdSeq = 0;
function nextUploadId() {
  uploadIdSeq += 1;
  return `up-${uploadIdSeq}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function PromiseAttachmentsPanel({
  promiseId,
  initialAttachments,
}: PromiseAttachmentsPanelProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 2500);
    return () => window.clearTimeout(timer);
  }, [success]);

  const totalCount = attachments.length + uploads.length;
  const canAddMore = totalCount < MAX_ATTACHMENTS_PER_PROMISE;
  const imageAttachments = useMemo(
    () => attachments.filter((attachment) => attachment.kind === "image"),
    [attachments]
  );

  useEffect(() => {
    imageAttachments.forEach((attachment) => {
      if (previewUrls[attachment.id]) return;
      void (async () => {
        const response = await fetch(`/api/attachments/${attachment.id}/url`);
        if (!response.ok) return;
        const payload = (await response.json()) as { url?: string };
        if (!payload.url) return;
        setPreviewUrls((prev) => ({ ...prev, [attachment.id]: payload.url }));
      })();
    });
  }, [imageAttachments, previewUrls]);

  async function openAttachment(attachmentId: string) {
    const response = await fetch(`/api/attachments/${attachmentId}/url`);
    if (!response.ok) {
      setError("Could not open attachment.");
      return;
    }
    const payload = (await response.json()) as { url?: string };
    if (!payload.url) {
      setError("Could not open attachment.");
      return;
    }
    window.open(payload.url, "_blank", "noopener,noreferrer");
  }

  async function removeAttachment(attachmentId: string) {
    const response = await fetch(`/api/attachments/${attachmentId}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not delete attachment.");
      return;
    }
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== attachmentId));
    setSuccess("Attachment removed");
  }

  function onPickFile() {
    setError(null);
    fileRef.current?.click();
  }

  function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const rule = getAttachmentRule(file.type);
    if (!rule) {
      setError("Unsupported file type.");
      return;
    }
    if (file.size > rule.maxBytes) {
      setError(`File exceeds limit (${formatBytes(rule.maxBytes)}).`);
      return;
    }
    if (!canAddMore) {
      setError("A promise can have at most 5 attachments.");
      return;
    }

    const tempId = nextUploadId();
    const nextUpload: UploadItem = {
      id: tempId,
      file,
      progress: 0,
      attempts: 1,
      state: "uploading",
    };
    setUploads((prev) => [...prev, nextUpload]);
    void runUpload(nextUpload);
  }

  function setUploadState(id: string, patch: Partial<UploadItem>) {
    setUploads((prev) => prev.map((upload) => (upload.id === id ? { ...upload, ...patch } : upload)));
  }

  async function runUpload(upload: UploadItem) {
    setUploadState(upload.id, { state: "uploading", error: undefined, progress: 0 });
    try {
      const requestUpload = await fetch("/api/attachments/request-upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          promiseId,
          filename: upload.file.name,
          mimeType: upload.file.type,
          sizeBytes: upload.file.size,
        }),
      });
      if (!requestUpload.ok) {
        const payload = (await requestUpload.json()) as { error?: string };
        throw new Error(payload.error ?? "Could not start upload.");
      }
      const uploadInfo = (await requestUpload.json()) as { uploadUrl: string; objectKey: string };

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadInfo.uploadUrl);
        xhr.setRequestHeader("Content-Type", upload.file.type);
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadState(upload.id, { progress });
        };
        xhr.onerror = () => reject(new Error("Upload failed."));
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error("Upload failed."));
        };
        xhr.send(upload.file);
      });

      const completeUpload = await fetch("/api/attachments/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          promiseId,
          objectKey: uploadInfo.objectKey,
          mimeType: upload.file.type,
          sizeBytes: upload.file.size,
        }),
      });
      if (!completeUpload.ok) {
        const payload = (await completeUpload.json()) as { error?: string };
        throw new Error(payload.error ?? "Could not save attachment.");
      }

      const created = (await completeUpload.json()) as {
        id: string;
        kind: "image" | "audio" | "pdf" | "video";
        mime_type: string;
        size_bytes: number;
        created_at: string;
      };
      setAttachments((prev) => [
        {
          id: created.id,
          kind: created.kind,
          mimeType: created.mime_type,
          sizeBytes: created.size_bytes,
          createdAt: created.created_at,
        },
        ...prev,
      ]);
      setUploads((prev) => prev.filter((item) => item.id !== upload.id));
      setSuccess("Attachment uploaded");
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Upload failed.";
      setUploadState(upload.id, {
        state: "failed",
        progress: 0,
        error: message,
      });
    }
  }

  function retryUpload(uploadId: string) {
    const upload = uploads.find((item) => item.id === uploadId);
    if (!upload) return;
    const attempts = upload.attempts + 1;
    const next = { ...upload, attempts };
    setUploads((prev) =>
      prev.map((item) => (item.id === uploadId ? { ...item, attempts, state: "uploading", error: undefined } : item))
    );
    void runUpload(next);
  }

  function removeFailedUpload(uploadId: string) {
    setUploads((prev) => prev.filter((item) => item.id !== uploadId));
  }

  function attachmentIcon(kind: Attachment["kind"]) {
    if (kind === "image") return <ImageIcon className="size-5" />;
    if (kind === "audio") return <FileAudio className="size-5" />;
    if (kind === "pdf") return <FileText className="size-5" />;
    return <FileVideo className="size-5" />;
  }

  return (
    <section className="space-y-3 rounded-lg border border-line-strong bg-card p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        Attachments · {totalCount}/{MAX_ATTACHMENTS_PER_PROMISE}
      </p>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,application/pdf,video/mp4"
        onChange={onFileSelected}
      />

      <div className="grid grid-cols-3 gap-2">
        {uploads.map((upload) => (
          <div
            key={upload.id}
            className={`aspect-square rounded-lg border p-2 ${
              upload.state === "failed" ? "border-[#e8b79a] bg-coral-soft/40" : "border-line-strong bg-background"
            }`}
          >
            <div className="flex h-full flex-col justify-between">
              <div className="text-xs text-foreground">{upload.file.name.slice(0, 18)}</div>
              {upload.state === "uploading" ? (
                <div>
                  <div className="h-1.5 w-full rounded bg-muted">
                    <div
                      className="h-1.5 rounded bg-primary transition-all"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{upload.progress}%</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-[11px] text-coral-ink">Upload failed</p>
                  <p className="text-[10px] text-coral-ink">attempts: {upload.attempts} · max 3 before manual</p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => retryUpload(upload.id)}
                      className="rounded border border-line-strong px-2 py-0.5 text-[10px]"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFailedUpload(upload.id)}
                      className="rounded border border-line-strong px-2 py-0.5 text-[10px]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {attachments.map((attachment) => (
          <div key={attachment.id} className="group relative aspect-square overflow-hidden rounded-lg border border-line-strong bg-background">
            <button
              type="button"
              onClick={() => openAttachment(attachment.id)}
              className="flex h-full w-full items-center justify-center text-muted-foreground"
              title="Open attachment"
            >
              {attachment.kind === "image" && previewUrls[attachment.id] ? (
                <img src={previewUrls[attachment.id]} alt="Attachment preview" className="h-full w-full object-cover" />
              ) : (
                attachmentIcon(attachment.kind)
              )}
            </button>
            <button
              type="button"
              onClick={() => removeAttachment(attachment.id)}
              className="absolute right-1 top-1 rounded bg-card/95 px-1.5 py-0.5 text-[10px] text-coral-ink opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
            >
              Remove
            </button>
          </div>
        ))}

        {canAddMore ? (
          <button
            type="button"
            onClick={onPickFile}
            className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-line-strong bg-background text-muted-foreground hover:bg-muted/40"
          >
            <Plus className="size-5" />
          </button>
        ) : null}
      </div>

      {error ? <WafaToast variant="coral">{error}</WafaToast> : null}
      {success ? <WafaToast>{success}</WafaToast> : null}
    </section>
  );
}
