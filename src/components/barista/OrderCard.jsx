import { useState } from "react";
import { Pencil, Undo2 } from "lucide-react";
import { kisaSiparisNo } from "../../utils/siparisNo";
import ElapsedPill from "./ElapsedPill";
import PaymentChip from "./PaymentChip";

// Her aşamada tek bir ana aksiyon. Durum değerleri ve güncellemeler
// BaristaPage'deki updateOrderStatus üzerinden, öncekiyle aynı.
function anaAksiyon(order) {
  if (order.status === "pending") {
    return { etiket: "Hazırlamaya başla", renk: "var(--color-terracotta)", golge: "var(--shadow-cta)", durum: "preparing" };
  }
  if (order.status === "preparing") {
    return { etiket: "Hazır olarak işaretle", renk: "var(--color-sage-deep)", golge: "0 16px 28px -14px rgba(94, 107, 90, 0.9)", durum: "ready" };
  }
  // ready → teslim. Nakit bekliyorsa ödeme + teslim TEK güncellemede
  // (yarım kalmış "ödendi ama teslim edilmedi" kaydı oluşmasın).
  const nakitBekliyor = order.paymentStatus === "beklemede";
  return {
    etiket: nakitBekliyor ? "Ödemeyi aldım · Teslim et" : "Teslim edildi",
    renk: "var(--color-text)", golge: "0 16px 28px -16px rgba(43, 33, 28, 0.8)", yazi: "var(--color-bg)",
    durum: "completed", ekAlanlar: nakitBekliyor ? { paymentStatus: "odendi" } : {}
  };
}

const ONCEKI_DURUM = { preparing: "pending", ready: "preparing" };

function saatMetni(createdAt) {
  return createdAt?.toDate ? createdAt.toDate().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "şimdi";
}

export default function OrderCard({ order, onDurumGuncelle }) {
  const [islemde, setIslemde] = useState(false);
  const [hata, setHata] = useState(false);

  const aksiyon = anaAksiyon(order);
  const yeni = order.status === "pending";
  const urunAdedi = (order.items || []).reduce((t, i) => t + (i.qty || 0), 0);
  const toplam = order.totalPrice ?? (order.items || []).reduce((t, i) => t + (i.price || 0) * (i.qty || 0), 0);

  // Çift dokunmayı engelle; hata olursa kartta göster (konsol yerine)
  const calistir = async (durum, ekAlanlar) => {
    if (islemde) return;
    setIslemde(true);
    setHata(false);
    const basarili = await onDurumGuncelle(order.id, durum, ekAlanlar);
    if (!basarili) {
      setHata(true);
      setIslemde(false);
    }
    // başarılıysa kart zaten başka sütuna taşınıp yeniden oluşturuluyor
  };

  return (
    <article
      className="flora-slide-in"
      style={{
        background: "var(--color-surface)", borderRadius: "var(--radius-panel-card)", padding: 18,
        border: `1px solid ${yeni ? "transparent" : "var(--color-border-soft)"}`,
        boxShadow: yeni
          ? "0 0 0 2px rgba(169, 85, 42, 0.55), var(--shadow-soft)"
          : "var(--shadow-soft)",
        display: "flex", flexDirection: "column", gap: 14
      }}
    >
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 600, lineHeight: 1.1 }}>
            Masa {order.tableNumber ?? order.table ?? "?"}
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 600, color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" }}>
            <span style={{ color: "var(--color-text)", fontWeight: 700 }}>#{kisaSiparisNo(order.id)}</span> · {saatMetni(order.createdAt)}
          </p>
        </div>
        <ElapsedPill createdAt={order.createdAt} />
      </header>

      <PaymentChip order={order} />

      <ul style={{
        listStyle: "none", margin: 0, padding: "12px 0",
        borderTop: "1.5px dashed var(--color-border)", borderBottom: "1.5px dashed var(--color-border)",
        display: "flex", flexDirection: "column", gap: 10
      }}>
        {(order.items || []).map((item, idx) => (
          <li key={idx} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              minWidth: 32, height: 32, padding: "0 8px", boxSizing: "border-box", borderRadius: 10, flexShrink: 0,
              background: "var(--color-text)", color: "var(--color-bg)", fontSize: 16, fontWeight: 700,
              display: "inline-flex", alignItems: "center", justifyContent: "center", fontVariantNumeric: "tabular-nums"
            }}>
              {item.qty}
            </span>
            <span style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.3, overflowWrap: "anywhere" }}>{item.name}</span>
          </li>
        ))}
      </ul>

      {order.not && (
        <div style={{
          display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 16,
          background: "var(--color-note-bg)", border: "1px solid var(--color-note-border)", color: "var(--color-note-text)"
        }}>
          <Pencil size={17} strokeWidth={2.2} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, lineHeight: 1.4, overflowWrap: "anywhere" }}>
            <span className="flora-sr-only">Müşteri notu: </span>{order.not}
          </p>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-muted)" }}>{urunAdedi} ürün</span>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{toplam} ₺</span>
      </div>

      {hata && (
        <p role="alert" style={{ margin: 0, padding: "10px 14px", borderRadius: 12, fontSize: 14, fontWeight: 600, background: "var(--color-danger-bg)", color: "var(--color-danger-text)" }}>
          İşlem kaydedilemedi, tekrar dene.
        </p>
      )}

      <button
        onClick={() => calistir(aksiyon.durum, aksiyon.ekAlanlar)}
        disabled={islemde}
        className="flora-tap"
        style={{
          width: "100%", minHeight: 56, padding: "0 16px", border: "none", borderRadius: "var(--radius-button)",
          background: aksiyon.renk, color: aksiyon.yazi || "#fff", boxShadow: aksiyon.golge,
          fontSize: 17, fontWeight: 700, cursor: islemde ? "progress" : "pointer", opacity: islemde ? 0.7 : 1
        }}
      >
        {aksiyon.etiket}
      </button>

      {ONCEKI_DURUM[order.status] && (
        <button
          onClick={() => calistir(ONCEKI_DURUM[order.status])}
          disabled={islemde}
          className="flora-tap"
          style={{
            alignSelf: "center", minHeight: 44, padding: "0 16px", border: "none", background: "transparent",
            borderRadius: "var(--radius-button)", color: "var(--color-text-muted)", fontSize: 14, fontWeight: 700,
            cursor: islemde ? "progress" : "pointer", display: "inline-flex", alignItems: "center", gap: 6
          }}
        >
          <Undo2 size={16} strokeWidth={2.2} aria-hidden="true" /> Geri al
        </button>
      )}
    </article>
  );
}
