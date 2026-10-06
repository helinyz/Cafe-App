import { ArrowUpRight } from "lucide-react";
import ImageWithFallback from "./ImageWithFallback";
import { BolumBasligi } from "./PopularSection";

const TONLAR = ["var(--color-clay)", "var(--color-cream)"];

function KategoriKarti({ kategori, vurgulu, ton, onSec, t }) {
  const gorselBoyut = vurgulu ? 132 : 96;
  const metinRengi = vurgulu ? "#fff" : "var(--color-text)";
  const ikincilRenk = vurgulu ? "var(--color-sage-light)" : "var(--color-text-on-tint)";
  return (
    <button
      onClick={() => onSec(kategori.key)}
      className="flora-tap"
      style={{
        position: "relative", overflow: "hidden", textAlign: "left", cursor: "pointer", border: "none",
        gridColumn: vurgulu ? "1 / -1" : "auto",
        minHeight: vurgulu ? 150 : 172, padding: vurgulu ? "22px 22px 20px" : "16px 16px 16px",
        borderRadius: "var(--radius-card-lg)", background: vurgulu ? "var(--color-sage-deep)" : ton,
        boxShadow: "var(--shadow-soft)", display: "flex", flexDirection: "column", justifyContent: "flex-end"
      }}
    >
      {/* Yuvarlak ürün görseli sağ üst köşeden taşarak kırpılıyor; metin
          her zaman düz renk zeminin üzerinde kalıyor, fotoğrafın değil. */}
      <ImageWithFallback
        src={kategori.imageUrl}
        width={gorselBoyut} height={gorselBoyut}
        style={{
          position: "absolute", top: vurgulu ? -26 : -18, right: vurgulu ? -18 : -18,
          borderRadius: "50%", border: "4px solid rgba(255,255,255,0.35)"
        }}
      />
      {vurgulu && (
        <span aria-hidden="true" style={{
          position: "absolute", left: 22, top: 22, width: 36, height: 36, borderRadius: "50%",
          background: "rgba(255,255,255,0.16)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <ArrowUpRight size={18} strokeWidth={2.2} />
        </span>
      )}
      <span style={{
        position: "relative", display: "block", maxWidth: vurgulu ? "62%" : "100%",
        fontFamily: "var(--font-serif)", fontSize: vurgulu ? 26 : 19, fontWeight: 600, lineHeight: 1.15,
        color: metinRengi, overflowWrap: "anywhere"
      }}>
        {kategori.label}
      </span>
      <span style={{ position: "relative", display: "block", marginTop: 4, fontSize: 12, fontWeight: 600, color: ikincilRenk }}>
        {kategori.count} {t.urun}
        {kategori.gfCount > 0 && <> · {kategori.gfCount} {t.glutensizKisa}</>}
      </span>
    </button>
  );
}

export default function CategoryGrid({ kategoriler, onSec, t }) {
  if (!kategoriler.length) return null;
  return (
    <section style={{ paddingTop: 26 }}>
      <BolumBasligi baslik={t.kategoriler} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "0 20px" }}>
        {kategoriler.map((k, i) => (
          <KategoriKarti key={k.key} kategori={k} vurgulu={i === 0} ton={TONLAR[(i - 1) % 2]} onSec={onSec} t={t} />
        ))}
      </div>
    </section>
  );
}
