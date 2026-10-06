import { Plus } from "lucide-react";
import ImageWithFallback from "./ImageWithFallback";
import GlutenBadge from "./GlutenBadge";

export function BolumBasligi({ baslik, vurgu }) {
  return (
    <h2 style={{ margin: "0 20px 14px", fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 600, color: "var(--color-text)", lineHeight: 1.15 }}>
      {baslik}{vurgu && <> <em style={{ fontStyle: "italic", fontWeight: 400 }}>{vurgu}</em></>}
    </h2>
  );
}

// "Popüler seçimler": sipariş geçmişinden hesaplanan populerUrunler listesi
// (mantık CustomerPage'de, burada sadece görünüm).
export default function PopularSection({ items, dil, t, cart, onAdd }) {
  if (!items.length) return null;
  return (
    <section style={{ paddingTop: 22 }}>
      <BolumBasligi baslik={t.populerBaslik} vurgu={t.populerVurgu} />
      <div className="flora-scroll-row" style={{ gap: 14, paddingBottom: 6 }}>
        {items.map(item => {
          const isim = dil === "en" ? (item.nameEN || item.name) : item.name;
          const aciklama = dil === "en" ? (item.descriptionEN || item.description) : item.description;
          const adet = cart.find(c => c.id === item.id)?.qty || 0;
          return (
            <article key={item.id} style={{
              width: 158, background: "var(--color-surface)", borderRadius: "var(--radius-card)",
              padding: 8, boxShadow: "var(--shadow-soft)", border: "1px solid var(--color-border-soft)", boxSizing: "border-box"
            }}>
              <div style={{ position: "relative" }}>
                <ImageWithFallback src={item.imageUrl} width={142} height={124} radius={18} />
                {item.glutensiz && (
                  <GlutenBadge label={t.glutensiz} variant="glass" style={{ position: "absolute", top: 8, left: 8 }} />
                )}
              </div>
              <div style={{ padding: "10px 4px 2px" }}>
                <h3 className="flora-clamp-1" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>{isim}</h3>
                <p className="flora-clamp-1" style={{ margin: "2px 0 8px", fontSize: 12, color: "var(--color-text-muted)", minHeight: 16 }}>{aciklama}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-price)" }}>{item.price} ₺</span>
                  <button
                    onClick={() => onAdd(item)}
                    aria-label={`${t.sepeteEkle}: ${isim}`}
                    className="flora-tap"
                    style={{
                      position: "relative", width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
                      background: "var(--color-terracotta)", color: "#fff", boxShadow: "var(--shadow-cta)",
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}
                  >
                    <Plus size={20} strokeWidth={2.4} />
                    {adet > 0 && (
                      <span key={adet} className="flora-pop-in" style={{
                        position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 4px", boxSizing: "border-box",
                        borderRadius: "var(--radius-pill)", background: "var(--color-text)", color: "#fff",
                        border: "2px solid var(--color-surface)", fontSize: 10, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>{adet}</span>
                    )}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
