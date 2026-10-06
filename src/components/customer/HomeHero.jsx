import { MapPin, Coffee } from "lucide-react";
import Blob from "./Blob";
import ImageWithFallback from "./ImageWithFallback";

export default function HomeHero({ cafeName, tagline, tableNumber, dil, onDilDegistir, heroImageUrl }) {
  return (
    <div style={{
      position: "relative", background: "var(--color-sage-light)",
      borderRadius: "0 0 36px 36px", padding: "16px 20px 26px", overflow: "hidden"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.72)", padding: "7px 14px", borderRadius: "var(--radius-pill)", fontWeight: 700, fontSize: 13, color: "var(--color-sage-deep)", fontFamily: "var(--font-sans)" }}>
          <MapPin size={14} strokeWidth={2.3} />
          {dil === "tr" ? "Masa" : "Table"} {tableNumber}
        </div>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.72)", borderRadius: "var(--radius-pill)", padding: 3 }}>
          {["tr", "en"].map(d => (
            <button
              key={d}
              onClick={() => onDilDegistir(d)}
              style={{
                padding: "6px 14px", borderRadius: "var(--radius-pill)", border: "none", cursor: "pointer",
                background: dil === d ? "var(--color-text)" : "transparent",
                color: dil === d ? "#fff" : "var(--color-text-muted)",
                fontSize: 11, fontWeight: 700, fontFamily: "var(--font-sans)", minHeight: 28
              }}
            >
              {d.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative", zIndex: 2 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--color-sage-deep)", textTransform: "uppercase", fontFamily: "var(--font-sans)" }}>
            {dil === "tr" ? "Hoş geldiniz" : "Welcome"}
          </p>
          <h1 style={{ margin: "0 0 6px", fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 600, color: "var(--color-text)", lineHeight: 1.1 }}>
            {cafeName}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.4, fontFamily: "var(--font-sans)" }}>
            {tagline}
          </p>
        </div>

        <div style={{ position: "relative", width: 108, height: 108, flexShrink: 0 }}>
          <Blob color="var(--color-sage)" opacity={0.45} style={{ position: "absolute", inset: -20, width: "calc(100% + 40px)", height: "calc(100% + 40px)" }} />
          {heroImageUrl ? (
            <ImageWithFallback
              src={heroImageUrl}
              width="100%" height="100%"
              style={{ position: "relative", borderRadius: "50%", border: "4px solid rgba(255,255,255,0.65)" }}
            />
          ) : (
            <div style={{
              position: "relative", width: "100%", height: "100%", borderRadius: "50%",
              background: "var(--color-terracotta)", display: "flex", alignItems: "center", justifyContent: "center",
              border: "4px solid rgba(255,255,255,0.65)"
            }}>
              <Coffee size={38} strokeWidth={1.6} color="#fff" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
