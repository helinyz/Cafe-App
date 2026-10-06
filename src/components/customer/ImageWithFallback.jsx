import { ImageOff } from "lucide-react";

// Menü/kategori görseli yoksa (Firestore'daki imageUrl boşsa) kırık resim
// ikonu göstermek yerine nötr bir yer tutucu render eder.
export default function ImageWithFallback({ src, width = "100%", height = "100%", radius, style, alt = "" }) {
  const boxStyle = { width, height, borderRadius: radius, ...style };
  if (!src) {
    const iconSize = Math.min(
      typeof width === "number" ? width : 60,
      typeof height === "number" ? height : 60
    ) * 0.3;
    return (
      <div style={{ ...boxStyle, background: "var(--color-surface-alt)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <ImageOff size={iconSize} strokeWidth={1.5} color="var(--color-text-muted)" />
      </div>
    );
  }
  return <img src={src} alt={alt} style={{ ...boxStyle, objectFit: "cover", flexShrink: 0, display: "block" }} />;
}
