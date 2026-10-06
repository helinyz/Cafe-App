import { Bell, X } from "lucide-react";

// Barista siparişi "completed" yapınca üstte beliren bildirim bandı.
// Uygulamanın 480px sütununa hizalı yüzen bir pill.
export default function OrderReadyBanner({ gorunur, onKapat, t }) {
  if (!gorunur) return null;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 500, paddingTop: "calc(12px + env(safe-area-inset-top, 0px))", pointerEvents: "none" }}>
      <div className="flora-overlay-content" style={{ padding: "0 16px" }}>
        <div role="alert" className="flora-pop-in" style={{
          pointerEvents: "auto", display: "flex", alignItems: "center", gap: 10, padding: "6px 6px 6px 8px",
          borderRadius: "var(--radius-pill)", background: "var(--color-terracotta)", color: "#fff", boxShadow: "var(--shadow-cta)"
        }}>
          <span aria-hidden="true" style={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Bell size={18} strokeWidth={2.2} />
          </span>
          <p style={{ margin: 0, flex: 1, fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{t.siparisHazirBildirim}</p>
          <button onClick={onKapat} aria-label={t.kapat} className="flora-tap" style={{
            width: 44, height: 44, borderRadius: "50%", border: "none", background: "transparent", color: "#fff", cursor: "pointer", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
}
