import { Clock } from "lucide-react";
import useSimdi from "../../hooks/useSimdi";

// Sipariş verildiğinden beri geçen süre: < 8 dk sage, 8–12 dk amber,
// ≥ 12 dk kırmızı + "gecikti". 30 sn'de bir yenileniyor (dakika hassasiyeti).
export default function ElapsedPill({ createdAt }) {
  const simdi = useSimdi(30000);
  const baslangic = createdAt?.toMillis ? createdAt.toMillis() : simdi;
  const dakika = Math.max(0, Math.floor((simdi - baslangic) / 60000));

  const ton = dakika >= 12
    ? { bg: "var(--color-danger-bg)", fg: "var(--color-danger-text)" }
    : dakika >= 8
      ? { bg: "var(--color-warn-bg)", fg: "var(--color-warn-text)" }
      : { bg: "var(--color-live-bg)", fg: "var(--color-live-text)" };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, height: 32, padding: "0 12px", flexShrink: 0,
      borderRadius: "var(--radius-pill)", background: ton.bg, color: ton.fg,
      fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums"
    }}>
      <Clock size={14} strokeWidth={2.3} aria-hidden="true" />
      {dakika < 1 ? "Şimdi" : `${dakika} dk`}
      {dakika >= 12 && " · gecikti"}
    </span>
  );
}
