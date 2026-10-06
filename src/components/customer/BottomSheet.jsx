import { useEffect } from "react";
import { X } from "lucide-react";

// Ortak alt sheet iskeleti (sepet + menü asistanı): karartılmış arka plan
// (dokununca kapanır), tutamak, başlık satırı, kaydırılan gövde ve isteğe
// bağlı sabit alt kısım. Genişlik uygulamanın 480px sütunuyla sınırlı.
export default function BottomSheet({ baslik, altBaslik, solIkon, onKapat, kapatEtiketi, footer, yukseklik = "88vh", children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onKapat(); };
    window.addEventListener("keydown", onKey);
    // Sheet açıkken arkadaki sayfa kaymasın
    const oncekiOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = oncekiOverflow;
    };
  }, [onKapat]);

  return (
    <div
      className="flora-fade-in"
      onClick={onKapat}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(43, 33, 28, 0.5)", display: "flex", alignItems: "flex-end" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={baslik}
        className="flora-overlay-content flora-sheet-up"
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--color-bg)", borderRadius: "var(--radius-sheet) var(--radius-sheet) 0 0",
          maxHeight: yukseklik, display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 -20px 40px -24px rgba(43, 33, 28, 0.4)"
        }}
      >
        <div aria-hidden="true" style={{ width: 44, height: 5, borderRadius: 3, background: "var(--color-border)", margin: "10px auto 0", flexShrink: 0 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px 14px", flexShrink: 0 }}>
          {solIkon}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 600, color: "var(--color-text)", lineHeight: 1.15 }}>{baslik}</h2>
            {altBaslik && <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)" }}>{altBaslik}</p>}
          </div>
          <button
            onClick={onKapat}
            aria-label={kapatEtiketi}
            className="flora-tap"
            style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
              border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >
            <X size={19} strokeWidth={2.2} />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" }}>
          {children}
        </div>

        {footer && (
          <div style={{
            flexShrink: 0, padding: "14px 20px calc(16px + env(safe-area-inset-bottom, 0px))",
            borderTop: "1px solid var(--color-border-soft)", background: "var(--color-surface)"
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
