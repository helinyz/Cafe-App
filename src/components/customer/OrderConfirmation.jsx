import { Check, Banknote, CreditCard, MapPin, Receipt } from "lucide-react";
import Blob from "./Blob";
import OrderStatusStrip from "./OrderStatusStrip";
import { kisaSiparisNo } from "../../utils/siparisNo";

const pillStili = {
  display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px",
  borderRadius: "var(--radius-pill)", background: "rgba(255,255,255,0.75)",
  fontSize: 13, fontWeight: 700, color: "var(--color-sage-deep)"
};

// Sipariş onay ekranı. Sipariş numarası barista kartındakiyle aynı
// (bkz. utils/siparisNo.js); çevrimdışı kuyruğa alınan siparişin henüz id'si
// olmadığı için o durumda numara pili gizleniyor.
export default function OrderConfirmation({ siparis, siparisId, canliDurum, tableNumber, t, onMenuyeDon }) {
  const kisaNo = kisaSiparisNo(siparisId);
  const nakit = siparis?.paymentMethod === "nakit";
  const items = siparis?.items || [];

  return (
    <main className="flora-app" style={{ paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))" }}>
      <header style={{
        position: "relative", overflow: "hidden", textAlign: "center",
        background: "var(--color-sage-light)", borderRadius: "0 0 36px 36px", padding: "48px 24px 32px"
      }}>
        <Blob color="var(--color-sage)" opacity={0.22} style={{ position: "absolute", top: -80, right: -70, width: 230, height: 230 }} />
        <Blob color="var(--color-sage)" opacity={0.16} style={{ position: "absolute", bottom: -100, left: -80, width: 240, height: 240 }} />

        <div style={{ position: "relative" }}>
          <div className="flora-pop-in" aria-hidden="true" style={{
            width: 76, height: 76, borderRadius: "50%", margin: "0 auto 18px",
            background: "var(--color-sage-deep)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 16px 28px -14px rgba(94, 107, 90, 0.9)"
          }}>
            <Check size={36} strokeWidth={2.6} />
          </div>
          <h1 style={{ margin: "0 0 6px", fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 600, color: "var(--color-text)", lineHeight: 1.15 }}>
            {t.siparisAlindi}
          </h1>
          <p style={{ margin: "0 0 18px", fontSize: 15, color: "var(--color-text-on-tint)" }}>{t.siparisAlindiAciklama}</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            {kisaNo && (
              <span style={pillStili}><Receipt size={14} strokeWidth={2.3} aria-hidden="true" /> {t.siparisNo} #{kisaNo}</span>
            )}
            <span style={pillStili}><MapPin size={14} strokeWidth={2.3} aria-hidden="true" /> {t.masa} {tableNumber}</span>
          </div>
        </div>
      </header>

      <div className="flora-fade-up" style={{ padding: "22px 20px 0", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Bu siparişin canlı durumu: alındı → hazırlanıyor → hazır */}
        <OrderStatusStrip siparisler={canliDurum ? [{ id: siparisId, durum: canliDurum }] : []} t={t} />
        {items.length > 0 && (
          <section style={{
            background: "var(--color-surface)", borderRadius: "var(--radius-card)", padding: "18px 20px",
            border: "1px solid var(--color-border-soft)", boxShadow: "var(--shadow-soft)"
          }}>
            <h2 style={{ margin: "0 0 12px", fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 600, color: "var(--color-text)" }}>{t.siparisOzeti}</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((item, i) => (
                <li key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
                  <span style={{ color: "var(--color-text)", minWidth: 0, overflowWrap: "anywhere" }}>
                    <span style={{ fontWeight: 700 }}>{item.qty} ×</span> {item.name}
                  </span>
                  <span style={{ fontWeight: 700, color: "var(--color-text)", whiteSpace: "nowrap" }}>{item.price * item.qty} ₺</span>
                </li>
              ))}
            </ul>
            <div style={{ height: 1, background: "var(--color-border-soft)", margin: "14px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-muted)" }}>{t.toplam}</span>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 600, color: "var(--color-text)" }}>{siparis.totalPrice} ₺</span>
            </div>
          </section>
        )}

        {siparis?.paymentMethod && (
          <div role="status" style={{
            display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
            borderRadius: 20, background: "var(--color-payment-bg)", color: "var(--color-payment-text)"
          }}>
            <span aria-hidden="true" style={{
              width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.7)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              {nakit ? <Banknote size={19} strokeWidth={2} /> : <CreditCard size={19} strokeWidth={2} />}
            </span>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>
              {nakit ? t.nakitBilgi.replace("{tutar}", siparis.totalPrice) : t.kartBilgi}
            </p>
          </div>
        )}

        <button
          onClick={onMenuyeDon}
          className="flora-tap"
          style={{
            marginTop: 6, width: "100%", minHeight: 52, borderRadius: "var(--radius-pill)", cursor: "pointer",
            border: "1.5px solid var(--color-border)", background: "transparent", color: "var(--color-text)",
            fontSize: 15, fontWeight: 700
          }}
        >
          {t.menuyeDon}
        </button>
      </div>
    </main>
  );
}
