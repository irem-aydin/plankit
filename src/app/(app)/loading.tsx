/** Uygulama içi sayfa geçişlerinde, veriler gelene kadar gösterilen iskelet. */
export default function AppLoading() {
  return (
    <div role="status" aria-label="Yükleniyor" className="animate-pulse space-y-6">
      <div className="h-8 w-56 rounded-lg bg-slate-200" />
      <div className="h-4 w-80 max-w-full rounded bg-slate-200" />
      <div className="space-y-3 pt-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
      <span className="sr-only">Yükleniyor…</span>
    </div>
  );
}
