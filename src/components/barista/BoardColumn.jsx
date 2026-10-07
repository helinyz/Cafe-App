// Panodaki tek sütun: renkli nokta + serif başlık + sayı, kendi içinde kayan
// kart listesi, boşken kesikli çerçeveli yer tutucu.
export default function BoardColumn({ baslik, renk, siparisler, bosMetin, kartCiz, baslikGizli = false }) {
  return (
    <section
      aria-label={`${baslik} (${siparisler.length})`}
      style={{
        display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0,
        background: "var(--color-surface-alt)", borderRadius: "var(--radius-column)", padding: 14
      }}
    >
      {!baslikGizli && (
        <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 6px 12px", flexShrink: 0 }}>
          <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: "50%", background: renk, flexShrink: 0 }} />
          <h2 style={{ margin: 0, flex: 1, fontFamily: "var(--font-serif)", fontSize: 21, fontWeight: 600, lineHeight: 1.2 }}>{baslik}</h2>
          <span style={{
            minWidth: 30, height: 30, padding: "0 9px", boxSizing: "border-box", borderRadius: "var(--radius-pill)",
            background: "var(--color-surface)", color: "var(--color-text)", fontSize: 14, fontWeight: 700,
            display: "inline-flex", alignItems: "center", justifyContent: "center", fontVariantNumeric: "tabular-nums"
          }}>
            {siparisler.length}
          </span>
        </header>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", display: "flex", flexDirection: "column", gap: 12, padding: 2 }}>
        {siparisler.length === 0 ? (
          <div style={{
            padding: "36px 16px", textAlign: "center", borderRadius: "var(--radius-panel-card)",
            border: "2px dashed var(--color-border)", color: "var(--color-text-on-tint)", fontSize: 15, fontWeight: 600
          }}>
            {bosMetin}
          </div>
        ) : (
          siparisler.map(kartCiz)
        )}
      </div>
    </section>
  );
}
