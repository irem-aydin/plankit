/**
 * Hesap güvenliği kuralları (saf fonksiyonlar).
 */
import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı.`)
  .max(72, "Şifre en fazla 72 karakter olabilir.")
  .regex(/[A-Za-zÇĞİÖŞÜçğıöşü]/, "Şifre en az bir harf içermeli.")
  .regex(/[0-9]/, "Şifre en az bir rakam içermeli.");

export const PASSWORD_HINT = `En az ${PASSWORD_MIN_LENGTH} karakter; en az bir harf ve bir rakam.`;

export const ACCOUNT_DELETE_CONFIRMATION = "HESABIMI SIL";

/** Açık yönlendirmeyi önlemek için yalnızca site içi yolları kabul eder. */
export function safeInternalPath(value: unknown, fallback: string): string {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") ? path : fallback;
}
