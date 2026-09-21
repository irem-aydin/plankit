"use client";

/** Kök yerleşim bile çizilemezse gösterilir; kendi html/body etiketlerini ve stillerini taşır. */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
          textAlign: "center",
          padding: 16,
        }}
      >
        <title>Bir şeyler ters gitti</title>
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 48 }} aria-hidden>
            ⚠️
          </div>
          <h1 style={{ fontSize: 24, margin: "16px 0 8px" }}>Bir şeyler ters gitti</h1>
          <p style={{ color: "#475569", margin: 0 }}>
            Beklenmeyen bir sorun oluştu. Birkaç saniye sonra tekrar dene.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 24,
              padding: "10px 16px",
              border: 0,
              borderRadius: 8,
              background: "#e11d48",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  );
}
