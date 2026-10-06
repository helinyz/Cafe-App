import { Sparkles, ArrowRight } from "lucide-react";

// Ekranın altında yüzen tek cam pill: solda Menü Asistanı, sağda (sepet
// doluysa) terracotta sepet özeti. Ayrı yuvarlak sohbet butonunun yerini alıyor.
// Konum: uygulamanın 480px'lik sütununa hizalı, kenarlardan 16px içeride.
export default function BottomActionBar({ cartCount, cartTotal, onAsistanAc, onSepetAc, t }) {
  return (
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 150, pointerEvents: "none",
      paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))"
    }}>
      <nav
        className="flora-overlay-content flora-fade-up"
        aria-label={t.menuAsistani}
        style={{ padding: "0 16px", pointerEvents: "none" }}
      >
        <div className="flora-glass" style={{
          pointerEvents: "auto", display: "flex", alignItems: "center", gap: 8, padding: 6,
          borderRadius: "var(--radius-pill)", border: "1px solid rgba(227, 217, 203, 0.9)",
          boxShadow: "0 18px 36px -18px rgba(43, 33, 28, 0.45)"
        }}>
          <button
            onClick={onAsistanAc}
            className="flora-tap"
            style={{
              flex: 1, minWidth: 0, height: 52, padding: "0 12px 0 6px", border: "none", background: "transparent",
              borderRadius: "var(--radius-pill)", cursor: "pointer", color: "var(--color-text)",
              display: "flex", alignItems: "center", gap: 10
            }}
          >
            <span aria-hidden="true" style={{
              width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
              background: "var(--color-sage-light)", color: "var(--color-sage-deep)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Sparkles size={18} strokeWidth={2.1} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {t.menuAsistani}
            </span>
          </button>

          {cartCount > 0 && (
            <button
              onClick={onSepetAc}
              aria-label={`${t.sepetiAc}: ${cartCount} ${cartCount === 1 ? t.urunTekil : t.urun}, ${cartTotal} ₺`}
              className="flora-tap flora-pop-in"
              style={{
                height: 52, padding: "0 18px", flexShrink: 0, border: "none", cursor: "pointer",
                borderRadius: "var(--radius-pill)", background: "var(--color-terracotta)", color: "#fff",
                boxShadow: "var(--shadow-cta)", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 8
              }}
            >
              <span key={`${cartCount}-${cartTotal}`} className="flora-pop-in">
                {cartCount} {cartCount === 1 ? t.urunTekil : t.urun} · {cartTotal} ₺
              </span>
              <ArrowRight size={17} strokeWidth={2.3} aria-hidden="true" />
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
