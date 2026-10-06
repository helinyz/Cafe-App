import { ArrowLeft, ShoppingBag } from "lucide-react";

const yuvarlakButon = {
  position: "relative", width: 44, height: 44, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center"
};

// Kategori görünümünün yapışkan, bulanık (cam) başlığı: geri, serif başlık +
// ürün sayıları, sepet. Cam efekti yalnızca bu yüzen başlıkta kullanılıyor.
export default function CategoryHeader({ baslik, count, gfCount, onGeri, cartCount, onSepetAc, t }) {
  return (
    <header className="flora-glass" style={{
      position: "sticky", top: 0, zIndex: 10, padding: "12px 16px",
      borderBottom: "1px solid var(--color-border-soft)",
      display: "flex", alignItems: "center", gap: 12
    }}>
      <button
        onClick={onGeri}
        aria-label={t.geriDon}
        className="flora-tap"
        style={{ ...yuvarlakButon, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)" }}
      >
        <ArrowLeft size={20} strokeWidth={2.2} />
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 className="flora-clamp-1" style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600, lineHeight: 1.2, color: "var(--color-text)" }}>
          {baslik}
        </h1>
        <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" }}>
          {count} {t.urun}{gfCount > 0 && <> · {gfCount} {t.glutensizKisa}</>}
        </p>
      </div>

      <button
        onClick={onSepetAc}
        disabled={cartCount === 0}
        aria-label={`${t.sepetiAc} (${cartCount})`}
        className="flora-tap"
        style={{
          ...yuvarlakButon, border: "none",
          background: cartCount > 0 ? "var(--color-terracotta)" : "var(--color-surface-alt)",
          color: cartCount > 0 ? "#fff" : "var(--color-text-muted)",
          boxShadow: cartCount > 0 ? "var(--shadow-cta)" : "none",
          cursor: cartCount > 0 ? "pointer" : "default"
        }}
      >
        <ShoppingBag size={19} strokeWidth={2.1} />
        {cartCount > 0 && (
          <span key={cartCount} className="flora-pop-in" style={{
            position: "absolute", top: -3, right: -3, minWidth: 20, height: 20, padding: "0 5px", boxSizing: "border-box",
            borderRadius: "var(--radius-pill)", background: "var(--color-text)", color: "#fff",
            border: "2px solid var(--color-bg)", fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            {cartCount}
          </span>
        )}
      </button>
    </header>
  );
}
