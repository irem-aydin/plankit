import Link from "next/link";
import { effectiveJob, isActive } from "@/core/jobs/job";
import { JobRepository } from "@/infrastructure/supabase/job-repository";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/infrastructure/supabase/server";

/** Başarısız işler bu süre boyunca listede görünür. */
const SHOW_FAILED_MS = 2 * 60 * 60_000;

/**
 * Arka planda hazırlanan (ve yakın zamanda başarısız olan) planlar. Kullanıcı
 * bekleme sayfasını kapattıysa işini buradan takip eder.
 */
export async function ActiveJobs() {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  const now = new Date();
  const jobs = (await new JobRepository(await createSupabaseServerClient()).listRecent(user.id).catch(() => []))
    .map((j) => effectiveJob(j, now))
    .filter(
      (j) =>
        isActive(j, now) ||
        (j.status === "failed" && now.getTime() - Date.parse(j.finishedAt ?? j.createdAt) < SHOW_FAILED_MS),
    );
  if (jobs.length === 0) return null;

  return (
    <ul className="space-y-2">
      {jobs.map((j) => {
        const active = isActive(j, now);
        const href = j.kind === "refine" && j.outputId ? `/ciktilar/${j.outputId}` : `/ciktilar/hazirlaniyor/${j.id}`;
        return (
          <li
            key={j.id}
            className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm ${
              active ? "border-pink-200 bg-pink-50" : "border-red-200 bg-red-50"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              {active ? (
                <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-pink-200 border-t-pink-600" />
              ) : (
                <span aria-hidden>⚠️</span>
              )}
              <span className="min-w-0">
                <span className="font-medium text-slate-900">{j.title}</span>
                <span className="block text-xs text-slate-600">
                  {active
                    ? j.kind === "refine"
                      ? "Güncelleniyor…"
                      : `Hazırlanıyor… ${j.progress && j.progress !== "Hazırlanıyor" ? `· ${j.progress}` : ""}`
                    : j.error}
                </span>
              </span>
            </span>
            {active ? (
              <Link href={href} className="font-semibold text-pink-700 hover:underline">
                İlerlemeyi gör →
              </Link>
            ) : (
              <Link href="/olustur" className="font-semibold text-red-700 hover:underline">
                Tekrar dene →
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
