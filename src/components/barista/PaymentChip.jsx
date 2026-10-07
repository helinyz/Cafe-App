import { Banknote, CreditCard } from "lucide-react";

// Ödeme durumu: nakit + beklemede → "Nakit · teslimde 210 ₺" (terracotta),
// ödenmiş → "Kart · ödendi" / "Nakit · ödendi" (sage). Ödeme bilgisi
// olmayan eski siparişlerde hiçbir şey gösterilmiyor.
export default function PaymentChip({ order, kucuk = false }) {
  if (!order.paymentMethod) return null;
  const nakit = order.paymentMethod === "nakit";
  const bekliyor = order.paymentStatus === "beklemede";
  const Icon = nakit ? Banknote : CreditCard;
  const metin = bekliyor
    ? `Nakit · teslimde ${order.totalPrice} ₺`
    : `${nakit ? "Nakit" : "Kart"} · ödendi`;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, height: kucuk ? 28 : 32, padding: "0 12px",
      borderRadius: "var(--radius-pill)", whiteSpace: "nowrap", fontSize: kucuk ? 13 : 14, fontWeight: 700,
      background: bekliyor ? "var(--color-payment-bg)" : "var(--color-live-bg)",
      color: bekliyor ? "var(--color-payment-text)" : "var(--color-live-text)"
    }}>
      <Icon size={kucuk ? 14 : 15} strokeWidth={2.2} aria-hidden="true" /> {metin}
    </span>
  );
}
