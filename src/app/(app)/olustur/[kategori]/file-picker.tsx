"use client";

import { useEffect, useRef, useState } from "react";
import {
  ACCEPTED_FILE_TYPES,
  classifyAttachment,
  formatFileSize,
  validateAttachments,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  UNSUPPORTED_FILE_MESSAGE,
} from "@/core/ai/attachments";

const KIND_ICONS = { image: "🖼️", pdf: "📄", text: "📃" } as const;

export interface FileSelection {
  files: File[];
  error: string | null;
  add: (incoming: FileList | null) => void;
  remove: (file: File) => void;
}

/**
 * Dosya seçimi tek yerde tutulur; seçici birden fazla adımda gösterilse de
 * forma tek bir <input type="file"> ile gider (dosyalar iki kez gönderilmez).
 */
export function useFileSelection(): FileSelection & { inputRef: React.RefObject<HTMLInputElement | null> } {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;
    const data = new DataTransfer();
    files.forEach((f) => data.items.add(f));
    inputRef.current.files = data.files;
  }, [files]);

  function apply(next: File[]) {
    const unsupported = next.find((f) => !classifyAttachment(f.type, f.name));
    if (unsupported) {
      setError(`"${unsupported.name}" desteklenmiyor. ${UNSUPPORTED_FILE_MESSAGE}`);
      return;
    }
    const sizeError = validateAttachments(next.map((f) => ({ name: f.name, size: f.size })));
    if (sizeError) {
      setError(sizeError);
      return;
    }
    setError(null);
    setFiles(next);
  }

  return {
    files,
    error,
    inputRef,
    add: (incoming) => {
      if (!incoming) return;
      const merged = [...files];
      for (const file of Array.from(incoming)) {
        if (!merged.some((f) => f.name === file.name && f.size === file.size)) merged.push(file);
      }
      apply(merged.slice(0, MAX_ATTACHMENTS));
    },
    remove: (file) => apply(files.filter((f) => f !== file)),
  };
}

/** Forma gönderilen gerçek dosya alanı (görünmez, tek kopya). */
export function FileInput({ inputRef }: { inputRef: React.RefObject<HTMLInputElement | null> }) {
  return <input ref={inputRef} type="file" name="files" multiple className="sr-only" tabIndex={-1} aria-hidden />;
}

export function FilePicker({
  selection,
  id,
  compact,
}: {
  selection: FileSelection;
  /** Aynı sayfada birden fazla seçici olabildiği için benzersiz olmalı */
  id: string;
  compact?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const { files, error, add, remove } = selection;

  return (
    <div className={compact ? "mt-5 border-t border-violet-200/70 pt-4" : "mt-6"}>
      <p className="text-sm font-medium text-slate-800">📎 Dosya ekle (isteğe bağlı)</p>
      <p className="mt-0.5 text-xs text-slate-600">
        Elindeki rapor, tablo, ekran görüntüsü veya sunumu ekle; yapay zekâ içeriğini okuyup plana dahil etsin. Görsel,
        PDF ve metin dosyaları (TXT, CSV, MD) desteklenir — Word/Excel dosyalarını PDF olarak kaydedebilirsin. En fazla{" "}
        {MAX_ATTACHMENTS} dosya, dosya başına {Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)} MB. Dosyalar sunucuda
        saklanmaz; yalnızca bu planı hazırlarken kullanılır.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        className={`mt-2 rounded-xl border-2 border-dashed p-4 text-center transition ${
          dragging ? "border-violet-500 bg-violet-50" : "border-slate-300 bg-white"
        }`}
      >
        <input
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
          className="sr-only"
          id={id}
        />
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-violet-700 hover:underline">
          Dosya seç
        </label>
        <span className="text-sm text-slate-500"> veya buraya sürükle</span>
      </div>

      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file) => {
            const kind = classifyAttachment(file.type, file.name) ?? "text";
            return (
              <li
                key={`${file.name}-${file.size}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden>{KIND_ICONS[kind]}</span>
                  <span className="truncate text-slate-800">{file.name}</span>
                  <span className="shrink-0 text-xs text-slate-500">{formatFileSize(file.size)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => remove(file)}
                  className="shrink-0 rounded px-2 py-1 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600"
                >
                  Kaldır
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
