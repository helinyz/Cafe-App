// "Canlı takip" / "Geçmiş" segmented control. Aktif sekme beyaz + gölge
// (müşteri sepetindeki ödeme seçicisiyle aynı dil).
export default function PanelTabs({ sekmeler, aktif, onSec }) {
  return (
    <div role="tablist" style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 20, background: "var(--color-surface-alt)" }}>
      {sekmeler.map(({ key, etiket, Icon, rozet }) => {
        const secili = aktif === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={secili}
            onClick={() => onSec(key)}
            className="flora-tap"
            style={{
              height: 48, padding: "0 20px", border: "none", cursor: "pointer", borderRadius: "var(--radius-button)",
              background: secili ? "var(--color-surface)" : "transparent",
              boxShadow: secili ? "0 6px 16px -8px rgba(43, 33, 28, 0.35)" : "none",
              color: secili ? "var(--color-text)" : "var(--color-text-on-tint)",
              fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8
            }}
          >
            {Icon && <Icon size={17} strokeWidth={2.1} aria-hidden="true" />}
            {etiket}
            {rozet > 0 && (
              <span style={{
                minWidth: 24, height: 24, padding: "0 7px", boxSizing: "border-box", borderRadius: "var(--radius-pill)",
                background: "var(--color-terracotta)", color: "#fff", fontSize: 12, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center"
              }}>
                {rozet}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
