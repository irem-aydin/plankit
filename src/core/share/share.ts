/**
 * Plan paylaşımı kuralları (saf fonksiyonlar).
 */
import type { GeneratedDocument } from "../output/document";

/** 18 bayt → 24 karakterlik URL-güvenli anahtar (tahmin edilemez). */
const TOKEN_BYTES = 18;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24}$/;

export function createShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isShareToken(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}

export function sharePath(token: string): string {
  return `/p/${token}`;
}

/**
 * Paylaşılan sayfada gösterilecek doküman. Kullanıcının plan için anlattığı
 * durum, profil adı ve eklediği dosyaların adları kişisel/gizli bilgi
 * içerebileceği için paylaşılmaz; yalnızca planın kendisi görünür.
 */
export function toSharedDocument(doc: GeneratedDocument): GeneratedDocument {
  return {
    ...doc,
    context: undefined,
    attachments: [],
    missing: [],
  };
}
