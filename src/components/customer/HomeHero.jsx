import { MapPin, Coffee } from "lucide-react";
import Blob from "./Blob";
import ImageWithFallback from "./ImageWithFallback";

// "Flora Cafe" -> "Flora" + italik "Cafe": son kelime editoryal vurgu olarak
// italik serif yazılıyor. Tek kelimelik isimler olduğu gibi kalıyor.
function VurguluBaslik({ text = "" }) {
  const kelimeler = text.trim().split(/\s+/);
  if (kelimeler.length < 2) return text;
  const son = kelimeler.pop();
  return <>{kelimeler.join(" ")} <em style={{ fontStyle: "italic", fontWeight: 400 }}>{son}</em></>;
}

export default function HomeHero({ cafeName, tagline, tableNumber, dil, onDilDegistir, heroImageUrl, t }) {
  return (
    <header style={{
      position: "relative", background: "var(--color-sage-light)",
      borderRadius: "0 0 36px 36px", padding: "14px 20px 28px", overflow: "hidden"
    }}>
      {/* Dekoratif ikinci blob — sol altta, hero'ya organik bir kenar veriyor */}
      <Blob color="var(--color-sage)" opacity={0.18} style={{ position: "absolute", left: -70, bottom: -90, width: 220, height: 220 }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 22, position: "relative", zIndex: 2 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.72)",
          padding: "0 14px", height: 36, borderRadius: "var(--radius-pill)",
          fontWeight: 700, fontSize: 13, color: "var(--color-sage-deep)"
        }}>
          <MapPin size={14} strokeWidth={2.3} aria-hidden="true" />
          {t.masa} {tableNumber}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div role="group" aria-label={t.dilSecimi} style={{ display: "flex", background: "rgba(255,255,255,0.72)", borderRadius: "var(--radius-pill)", padding: 3 }}>
            {["tr", "en"].map(d => (
              <button
                key={d}
                onClick={() => onDilDegistir(d)}
                aria-pressed={dil === d}
                className="flora-tap"
                style={{
                  minWidth: 44, height: 38, padding: "0 12px", borderRadius: "var(--radius-pill)", border: "none", cursor: "pointer",
                  background: dil === d ? "var(--color-sage-deep)" : "transparent",
                  color: dil === d ? "#fff" : "var(--color-text-on-tint)",
                  fontSize: 12, fontWeight: 700
                }}
              >
                {d.toUpperCase()}
              </button>
            ))}
          </div>

        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 2 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: "var(--color-sage-deep)", textTransform: "uppercase" }}>
            {t.hosgeldin}
          </p>
          <h1 style={{ margin: "0 0 8px", fontFamily: "var(--font-serif)", fontSize: 34, fontWeight: 600, color: "var(--color-text)", lineHeight: 1.05, overflowWrap: "anywhere" }}>
            <VurguluBaslik text={cafeName} />
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-on-tint)", lineHeight: 1.4 }}>
            {tagline}
          </p>
        </div>

        <div style={{ position: "relative", width: 128, height: 128, flexShrink: 0 }}>
          <Blob color="var(--color-sage)" opacity={0.45} style={{ position: "absolute", inset: -22, width: "calc(100% + 44px)", height: "calc(100% + 44px)" }} />
          {heroImageUrl ? (
            <ImageWithFallback
              src={heroImageUrl}
              width="100%" height="100%"
              style={{ position: "relative", borderRadius: "50%", border: "4px solid rgba(255,255,255,0.7)", boxShadow: "var(--shadow-soft)" }}
            />
          ) : (
            <div style={{
              position: "relative", width: "100%", height: "100%", borderRadius: "50%",
              background: "var(--color-terracotta)", display: "flex", alignItems: "center", justifyContent: "center",
              border: "4px solid rgba(255,255,255,0.7)"
            }}>
              <Coffee size={42} strokeWidth={1.6} color="#fff" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
