import Link from "next/link";
import { Logo } from "@/components/logo";
import { APP_NAME } from "@/config/app";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Link href="/" aria-label={APP_NAME} className="mb-8">
        <Logo className="text-xl" />
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </div>
  );
}
