import { useState } from "react";
import { Trash2 } from "lucide-react";
import { kisaSiparisNo } from "../../utils/siparisNo";
import { gecmisZamanMetni } from "../../utils/zaman";
import PaymentChip from "./PaymentChip";
import { TABLO_SUTUNLARI } from "./gecmisTablosu";


const kucukButon = {
  minHeight: 44, padding: "0 14px", borderRadius: "var(--radius-button)", cursor: "pointer",
  fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, whiteSpace: "nowrap"
};

// Geçmiş tablosunun bir satırı. "Sil" önce satır içinde onay istiyor
// (Vazgeç / Sil); tarayıcının confirm penceresi kullanılmıyor.
// `dar` modunda (1024px altı) satır, etiketli küçük bir karta dönüşüyor.
export default function HistoryRow({ order, onSil, dar }) {
  const [onay, setOnay] = useState(false);
  const [siliniyor, setSiliniyor] = useState(false);
  const [hata, setHata] = useState(false);

  const sil = async () => {
    setSiliniyor(true);
    setHata(false);
    const basarili = await onSil(order.id);
    if (!basarili) {
      setHata(true);
      setSiliniyor(false);
    }
  };

  const urunler = (order.items || []).map(i => `${i.qty} × ${i.name}`).join(", ");
  const masa = order.tableNumber ?? order.table ?? "—";
  const tutar = order.totalPrice ?? (order.items || []).reduce((t, i) => t + (i.price || 0) * (i.qty || 0), 0);

  const aksiyonlar = (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
      {onay ? (
        <>
          <button onClick={() => setOnay(false)} disabled={siliniyor} className="flora-tap" style={{ ...kucukButon, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)" }}>
            Vazgeç
          </button>
          <button onClick={sil} disabled={siliniyor} className="flora-tap" style={{ ...kucukButon, border: "none", background: "var(--color-danger-text)", color: "#fff", opacity: siliniyor ? 0.7 : 1 }}>
            Sil
          </button>
        </>
      ) : (
        <button onClick={() => setOnay(true)} aria-label={`#${kisaSiparisNo(order.id)} siparişini sil`} className="flora-tap" style={{ ...kucukButon, border: "none", background: "transparent", color: "var(--color-danger-text)" }}>
          <Trash2 size={16} strokeWidth={2.2} aria-hidden="true" /> Sil
        </button>
      )}
    </div>
  );

  const urunHucresi = (
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.4, overflowWrap: "anywhere" }}>{urunler || "—"}</p>
      {order.not && (
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-note-text)", lineHeight: 1.35, overflowWrap: "anywhere" }}>
          <span style={{ fontWeight: 700 }}>Not:</span> {order.not}
        </p>
      )}
      {hata && <p role="alert" style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 600, color: "var(--color-danger-text)" }}>Silinemedi, tekrar dene.</p>}
    </div>
  );

  const zaman = <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{gecmisZamanMetni(order.createdAt)}</span>;
  const kod = <span style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>#{kisaSiparisNo(order.id)}</span>;
  const tutarHucresi = <span style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{tutar} ₺</span>;

  if (dar) {
    return (
      <li style={{ padding: 16, borderBottom: "1px solid var(--color-border-soft)", display: "flex", flexDirection: "column", gap: 10, background: onay ? "var(--color-danger-bg)" : "transparent" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {kod}<span style={{ fontWeight: 700 }}>Masa {masa}</span>{zaman}
          <span style={{ marginLeft: "auto" }}>{tutarHucresi}</span>
        </div>
        {urunHucresi}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <PaymentChip order={order} kucuk />
          {aksiyonlar}
        </div>
      </li>
    );
  }

  return (
    <li style={{
      display: "grid", gridTemplateColumns: TABLO_SUTUNLARI, gap: 16, alignItems: "center",
      padding: "12px 20px", borderBottom: "1px solid var(--color-border-soft)",
      background: onay ? "var(--color-danger-bg)" : "transparent", transition: "background-color 150ms ease-out"
    }}>
      {zaman}
      {kod}
      <span style={{ fontSize: 15, fontWeight: 700 }}>{masa}</span>
      {urunHucresi}
      <span><PaymentChip order={order} kucuk /></span>
      {tutarHucresi}
      {aksiyonlar}
    </li>
  );
}
