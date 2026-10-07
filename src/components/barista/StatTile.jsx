// Başlıktaki sayaç kutusu. "vurgu" (terracotta tonu) sadece Tahsil edilecek
// kutusunda kullanılıyor.
export default function StatTile({ Icon, etiket, deger, vurgu = false }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", minWidth: 0,
      borderRadius: 20, border: `1px solid ${vurgu ? "transparent" : "var(--color-border-soft)"}`,
      background: vurgu ? "var(--color-payment-bg)" : "var(--color-surface)",
      boxShadow: vurgu ? "none" : "var(--shadow-soft)"
    }}>
      <span aria-hidden="true" style={{
        width: 40, height: 40, borderRadius: 14, flexShrink: 0,
        background: vurgu ? "rgba(255,255,255,0.7)" : "var(--color-surface-alt)",
        color: vurgu ? "var(--color-payment-text)" : "var(--color-sage-deep)",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <Icon size={19} strokeWidth={2} />
      </span>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 0.3, color: vurgu ? "var(--color-payment-text)" : "var(--color-text-muted)", whiteSpace: "nowrap" }}>
          {etiket}
        </p>
        <p style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 600, lineHeight: 1.15, color: vurgu ? "var(--color-payment-text)" : "var(--color-text)", fontVariantNumeric: "tabular-nums" }}>
          {deger}
        </p>
      </div>
    </div>
  );
}
