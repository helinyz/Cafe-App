import { Plus, Minus } from "lucide-react";
import ImageWithFallback from "./ImageWithFallback";
import GlutenBadge from "./GlutenBadge";

const stepperButon = {
  width: 44, height: 44, borderRadius: "50%", border: "none", flexShrink: 0, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "inherit"
};

// Sepette değilken yuvarlak + butonu; sepete eklenince aynı eleman genişleyip
// "− adet +" pill stepper'a dönüşüyor (bkz. .flora-stepper geçişi).
export function AdetKontrolu({ adet, onEkle, onCikar, urunIsmi, t }) {
  const sepette = adet > 0;
  return (
    <div
      className="flora-stepper"
      style={{
        width: sepette ? 120 : 44, height: 44, borderRadius: "var(--radius-pill)", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between", overflow: "hidden",
        background: sepette ? "var(--color-surface-alt)" : "var(--color-terracotta)",
        color: sepette ? "var(--color-text)" : "#fff",
        boxShadow: sepette ? "none" : "var(--shadow-cta)"
      }}
    >
      {sepette && (
        <>
          <button onClick={onCikar} aria-label={`${t.sepettenCikar}: ${urunIsmi}`} className="flora-tap" style={stepperButon}>
            <Minus size={17} strokeWidth={2.4} />
          </button>
          <span key={adet} className="flora-pop-in" aria-live="polite" aria-label={`${adet} ${t.adet}`} style={{ fontWeight: 700, fontSize: 15, minWidth: 18, textAlign: "center" }}>
            {adet}
          </span>
        </>
      )}
      <button
        onClick={onEkle}
        aria-label={`${t.sepeteEkle}: ${urunIsmi}`}
        className="flora-tap"
        style={{ ...stepperButon, ...(sepette ? { background: "var(--color-terracotta)", color: "#fff", width: 36, height: 36, marginRight: 4 } : {}) }}
      >
        <Plus size={sepette ? 17 : 20} strokeWidth={2.4} />
      </button>
    </div>
  );
}

export default function ProductCard({ item, adet, onEkle, onCikar, dil, t }) {
  const isim = dil === "en" && item.nameEN ? item.nameEN : item.name;
  const aciklama = dil === "en" && item.descriptionEN ? item.descriptionEN : item.description;
  return (
    <article className="flora-fade-up" style={{
      display: "flex", gap: 14, padding: 10, alignItems: "stretch",
      background: "var(--color-surface)", borderRadius: "var(--radius-card)",
      border: "1px solid var(--color-border-soft)", boxShadow: "var(--shadow-soft)"
    }}>
      <ImageWithFallback src={item.imageUrl} width={96} height={96} radius={18} alt="" />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "2px 2px 0 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--color-text)", lineHeight: 1.25, overflowWrap: "anywhere" }}>{isim}</h3>
          {item.glutensiz && <GlutenBadge label={t.glutensiz} />}
        </div>
        {aciklama && (
          <p className="flora-clamp-2" style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.4 }}>{aciklama}</p>
        )}
        <div style={{ marginTop: "auto", paddingTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: "var(--color-price)" }}>{item.price} ₺</span>
          <AdetKontrolu adet={adet} onEkle={() => onEkle(item)} onCikar={() => onCikar(item.id)} urunIsmi={isim} t={t} />
        </div>
      </div>
    </article>
  );
}
