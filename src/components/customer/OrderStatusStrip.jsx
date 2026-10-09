import { Bell, ChefHat, Receipt } from "lucide-react";
import { kisaSiparisNo } from "../../utils/siparisNo";

const ADIMLAR = ["pending", "preparing", "ready"];

function durumBilgisi(durum, t) {
  if (durum === "ready") return { etiket: t.durumHazir, Icon: Bell };
  if (durum === "preparing") return { etiket: t.durumHazirlaniyor, Icon: ChefHat };
  return { etiket: t.durumAlindi, Icon: Receipt };
}

// Müşterinin açık siparişlerinin kalıcı durum şeridi. "Hazır" bandı
// kapatılsa ya da kaçırılsa bile durum burada görünür kalıyor.
export default function OrderStatusStrip({ siparisler, t, style }) {
  if (!siparisler.length) return null;
  return (
    <section aria-label={t.siparisDurumu} aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
      {siparisler.map(({ id, durum }) => {
        const hazir = durum === "ready";
        const { etiket, Icon } = durumBilgisi(durum, t);
        const adim = Math.max(0, ADIMLAR.indexOf(durum));
        return (
          <div key={`${id}-${durum}`} className={hazir ? "flora-pop-in" : undefined} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 14px 10px 10px", borderRadius: 20,
            background: hazir ? "var(--color-sage-deep)" : "var(--color-surface)",
            color: hazir ? "#fff" : "var(--color-text)",
            border: hazir ? "none" : "1px solid var(--color-border-soft)",
            boxShadow: hazir ? "0 16px 28px -14px rgba(94, 107, 90, 0.9)" : "var(--shadow-soft)"
          }}>
            <span aria-hidden="true" style={{
              width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
              background: hazir ? "rgba(255,255,255,0.18)" : "var(--color-sage-light)",
              color: hazir ? "#fff" : "var(--color-sage-deep)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Icon size={18} strokeWidth={2.2} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, opacity: hazir ? 0.9 : 1, color: hazir ? "#fff" : "var(--color-text-muted)" }}>
                {t.siparisNo} #{kisaSiparisNo(id)}
              </p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{etiket}</p>
            </div>
            {/* 3 adımlı ilerleme: alındı → hazırlanıyor → hazır */}
            <div aria-hidden="true" style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {ADIMLAR.map((a, i) => (
                <span key={a} style={{
                  width: 18, height: 5, borderRadius: 3,
                  background: i <= adim
                    ? (hazir ? "#fff" : "var(--color-sage-deep)")
                    : (hazir ? "rgba(255,255,255,0.3)" : "var(--color-border)")
                }} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
