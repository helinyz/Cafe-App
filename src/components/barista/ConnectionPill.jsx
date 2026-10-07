// Firestore canlı dinleyicisinin durumu: "Canlı · 14:32" ya da "Bağlantı koptu".
// Barista ekranın donmadığını, siparişlerin gerçekten akmakta olduğunu
// buradan anlıyor.
export default function ConnectionPill({ bagli, saat }) {
  return (
    <div role="status" aria-live="polite" style={{
      display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 16px",
      borderRadius: "var(--radius-pill)", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap",
      background: bagli ? "var(--color-live-bg)" : "var(--color-danger-bg)",
      color: bagli ? "var(--color-live-text)" : "var(--color-danger-text)"
    }}>
      <span
        aria-hidden="true"
        className={bagli ? "flora-pulse" : undefined}
        style={{ width: 9, height: 9, borderRadius: "50%", background: bagli ? "var(--color-live-dot)" : "var(--color-danger-text)" }}
      />
      {bagli ? "Canlı" : "Bağlantı koptu"}
      <span style={{ fontWeight: 600, opacity: 0.85, fontVariantNumeric: "tabular-nums" }}>· {saat}</span>
    </div>
  );
}
