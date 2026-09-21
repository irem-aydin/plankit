"use client";

import { ErrorView } from "@/components/error-view";

/** Uygulama içi hatalar: üst menü ve alt bilgi yerinde kalır. */
export default function AppError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorView {...props} />;
}
