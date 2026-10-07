import { useState } from "react";
import useMediaQuery from "../../hooks/useMediaQuery";
import BoardColumn from "./BoardColumn";
import PanelTabs from "./PanelTabs";

const PANO_SUTUNLARI = [
  { durum: "pending", baslik: "Yeni siparişler", kisa: "Yeni", renk: "var(--color-terracotta)", bosMetin: "Yeni sipariş yok" },
  { durum: "preparing", baslik: "Hazırlanıyor", kisa: "Hazırlanıyor", renk: "#C98A1B", bosMetin: "Hazırlanan sipariş yok" },
  { durum: "ready", baslik: "Teslime hazır", kisa: "Teslime hazır", renk: "var(--color-sage-deep)", bosMetin: "Teslim bekleyen sipariş yok" },
];

// createdAt henüz sunucudan gelmemişse (serverTimestamp bekleniyor) sipariş
// en yeni kabul edilip sona konuyor.
const zamanDamgasi = (o) => (o.createdAt?.toMillis ? o.createdAt.toMillis() : Number.MAX_SAFE_INTEGER);

// Canlı pano: ≥1024px'te 3 eşit sütun (her biri kendi içinde kayıyor),
// daha dar ekranda sütunlar sekmeye dönüşüyor. Her sütunda en eski sipariş üstte.
export default function LiveBoard({ orders, kartCiz }) {
  const genis = useMediaQuery("(min-width: 1024px)");
  const [aktifSutun, setAktifSutun] = useState("pending");

  const sutunlar = PANO_SUTUNLARI.map(s => ({
    ...s,
    siparisler: orders.filter(o => o.status === s.durum).sort((a, b) => zamanDamgasi(a) - zamanDamgasi(b)),
  }));

  if (genis) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
        {sutunlar.map(s => (
          <BoardColumn key={s.durum} {...s} kartCiz={o => kartCiz(o, s.durum)} />
        ))}
      </div>
    );
  }

  const secili = sutunlar.find(s => s.durum === aktifSutun);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ overflowX: "auto" }}>
        <PanelTabs
          aktif={aktifSutun}
          onSec={setAktifSutun}
          sekmeler={sutunlar.map(s => ({ key: s.durum, etiket: s.kisa, rozet: s.siparisler.length }))}
        />
      </div>
      <BoardColumn {...secili} baslikGizli kartCiz={o => kartCiz(o, secili.durum)} />
    </div>
  );
}
