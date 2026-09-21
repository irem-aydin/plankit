"use client";

import { ErrorView } from "@/components/error-view";

export default function RootError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center">
      <ErrorView {...props} />
    </main>
  );
}
