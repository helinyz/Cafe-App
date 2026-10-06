import { Search, X, Leaf } from "lucide-react";

export function Chip({ aktif, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={aktif}
      className="flora-tap"
      style={{
        height: 44, padding: "0 18px", borderRadius: "var(--radius-pill)", cursor: "pointer",
        border: `1px solid ${aktif ? "var(--color-sage-deep)" : "var(--color-border)"}`,
        background: aktif ? "var(--color-sage-deep)" : "var(--color-surface)",
        color: aktif ? "#fff" : "var(--color-text)",
        fontSize: 14, fontWeight: 600, whiteSpace: "nowrap",
        display: "inline-flex", alignItems: "center", gap: 6
      }}
    >
      {children}
    </button>
  );
}

// Pill arama kutusu + yatay kaydırılabilir filtre chip'leri.
// Chip'ler mevcut state'i sürüyor (glutenFiltre / aktifKategori) — yeni bir
// filtreleme mantığı eklenmiyor.
export default function SearchFilters({ aramaMetni, onAramaDegistir, glutenFiltre, onGlutenToggle, aktifKategori, onTumu, kategoriler, onKategoriSec, t }) {
  return (
    <div style={{ padding: "20px 0 4px" }}>
      <div style={{ position: "relative", margin: "0 20px 14px" }}>
        <Search size={18} strokeWidth={2} color="var(--color-text-muted)" aria-hidden="true" style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)" }} />
        <input
          type="search"
          value={aramaMetni}
          onChange={e => onAramaDegistir(e.target.value)}
          placeholder={t.arama}
          aria-label={t.arama}
          className="flora-search"
          style={{
            width: "100%", height: 52, boxSizing: "border-box", padding: "0 48px 0 46px",
            borderRadius: "var(--radius-pill)", border: "1px solid var(--color-border)",
            background: "var(--color-surface)", color: "var(--color-text)", fontSize: 15, outline: "none",
            boxShadow: "var(--shadow-soft)", WebkitAppearance: "none"
          }}
        />
        {aramaMetni && (
          <button
            onClick={() => onAramaDegistir("")}
            aria-label={t.kapat}
            className="flora-tap"
            style={{
              position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
              width: 44, height: 44, borderRadius: "50%", border: "none", background: "transparent",
              color: "var(--color-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="flora-scroll-row" role="group" aria-label={t.filtreler} style={{ gap: 8 }}>
        <Chip aktif={!glutenFiltre && !aktifKategori} onClick={onTumu}>{t.tumu}</Chip>
        <Chip aktif={glutenFiltre} onClick={onGlutenToggle}>
          <Leaf size={15} strokeWidth={2.2} aria-hidden="true" /> {t.glutensiz}
        </Chip>
        {kategoriler.map(k => (
          <Chip key={k.key} aktif={aktifKategori === k.key} onClick={() => onKategoriSec(k.key)}>{k.label}</Chip>
        ))}
      </div>
    </div>
  );
}
