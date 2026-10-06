import { Leaf } from "lucide-react";

// Glutensiz rozeti. "glass" varyantı sadece fotoğraf üstünde kullanılıyor;
// arka plan opaklığı metnin fotoğraf üzerinde de AA kontrastı tutması için
// yüksek tutuldu.
export default function GlutenBadge({ label, variant = "solid", style }) {
  const glass = variant === "glass";
  return (
    <span
      className={glass ? "flora-glass" : undefined}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "4px 9px", borderRadius: "var(--radius-pill)",
        background: glass ? "rgba(250, 247, 242, 0.88)" : "var(--color-gf-bg)",
        color: "var(--color-gf-text)", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
        ...style
      }}
    >
      <Leaf size={11} strokeWidth={2.4} aria-hidden="true" /> {label}
    </span>
  );
}
