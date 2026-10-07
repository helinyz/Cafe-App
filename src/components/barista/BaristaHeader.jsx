import { Bell, ChefHat, PackageCheck, Banknote, Volume2, VolumeX, LogOut } from "lucide-react";
import LogoTile from "./LogoTile";
import ConnectionPill from "./ConnectionPill";
import StatTile from "./StatTile";

const ikonButon = {
  width: 48, height: 48, borderRadius: "var(--radius-button)", flexShrink: 0, cursor: "pointer",
  border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)",
  display: "flex", alignItems: "center", justifyContent: "center"
};

export default function BaristaHeader({ bagli, saat, sayilar, tahsilEdilecek, sesAcik, onSesDegistir, onCikis }) {
  return (
    <header style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <LogoTile />
        <div style={{ flex: 1, minWidth: 180 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 1.4, color: "var(--color-sage-deep)", textTransform: "uppercase" }}>Flora Cafe</p>
          <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 600, lineHeight: 1.1 }}>Barista Paneli</h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ConnectionPill bagli={bagli} saat={saat} />
          <button
            onClick={onSesDegistir}
            aria-pressed={sesAcik}
            aria-label={sesAcik ? "Sesli bildirimi kapat" : "Sesli bildirimi aç"}
            title={sesAcik ? "Sesli bildirim açık" : "Sesli bildirim kapalı"}
            className="flora-tap"
            style={{ ...ikonButon, ...(sesAcik ? {} : { color: "var(--color-text-muted)", background: "var(--color-surface-alt)" }) }}
          >
            {sesAcik ? <Volume2 size={20} strokeWidth={2} /> : <VolumeX size={20} strokeWidth={2} />}
          </button>
          <button onClick={onCikis} aria-label="Çıkış yap" title="Çıkış yap" className="flora-tap" style={ikonButon}>
            <LogOut size={19} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
        <StatTile Icon={Bell} etiket="Yeni" deger={sayilar.yeni} />
        <StatTile Icon={ChefHat} etiket="Hazırlanıyor" deger={sayilar.hazirlaniyor} />
        <StatTile Icon={PackageCheck} etiket="Teslime hazır" deger={sayilar.hazir} />
        <StatTile Icon={Banknote} etiket="Tahsil edilecek" deger={`${tahsilEdilecek} ₺`} vurgu />
      </div>
    </header>
  );
}
