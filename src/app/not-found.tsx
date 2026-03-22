import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 1rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "3.75rem", fontWeight: 700, margin: 0 }}>404</h1>
      <p style={{ marginTop: "0.75rem", fontSize: "1.125rem", color: "#6b7280" }}>
        Page not found · 找不到頁面
      </p>
      <p style={{ marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280", textAlign: "center" }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        <br />
        您尋找的頁面不存在或已被移動。
      </p>
      <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
        <Link
          href="/en"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            borderRadius: "0.5rem",
            backgroundColor: "#2563eb",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "white",
            textDecoration: "none",
          }}
        >
          &larr; Go Home
        </Link>
        <Link
          href="/zh-HK"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            borderRadius: "0.5rem",
            border: "1px solid #e5e7eb",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#111827",
            textDecoration: "none",
          }}
        >
          &larr; 返回首頁
        </Link>
      </div>
    </div>
  );
}
