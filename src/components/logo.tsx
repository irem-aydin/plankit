import { APP_NAME } from "@/config/app";

/**
 * Marka işareti: yükselen üç plan çubuğu ve onay işareti ("plan → sonuç").
 * app/icon.svg ile aynı çizim; değişiklik yapılırsa ikisi birlikte güncellenmeli.
 */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="plankit-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e11d48" />
          <stop offset="1" stopColor="#db2777" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#plankit-mark)" />
      <rect x="7" y="18" width="4" height="7" rx="1.5" fill="#fff" fillOpacity=".55" />
      <rect x="13" y="14" width="4" height="11" rx="1.5" fill="#fff" fillOpacity=".75" />
      <rect x="19" y="10" width="4" height="15" rx="1.5" fill="#fff" />
      <path d="M8 11.5l3 3 6-6.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** İşaret + yazı. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 ${className}`}>
      <LogoMark />
      {APP_NAME}
    </span>
  );
}
