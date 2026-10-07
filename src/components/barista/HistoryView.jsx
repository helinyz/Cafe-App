import { useState } from "react";
import { Search, X, Receipt, Wallet, Banknote, CreditCard } from "lucide-react";
import { Chip } from "../customer/SearchFilters";
import { kisaSiparisNo } from "../../utils/siparisNo";
import { tariheCevir, gunlerOncesi } from "../../utils/zaman";
import useMediaQuery from "../../hooks/useMediaQuery";
import StatTile from "./StatTile";
import HistoryRow from "./HistoryRow";
import { TABLO_SUTUNLARI } from "./gecmisTablosu";

const ARALIKLAR = [
  { key: "bugun", etiket: "Bugün", gun: 1 },
  { key: "7gun", etiket: "Son 7 gün", gun: 7 },
];

// Arama: sipariş kodu, masa ya da ürün adı (Türkçe büyük/küçük harf duyarsız)
function aramayaUyar(order, metin) {
  if (!metin) return true;
  const ara = metin.trim().replace(/^#/, "").toLocaleLowerCase("tr");
  const alanlar = [
    kisaSiparisNo(order.id),
    String(order.tableNumber ?? order.table ?? ""),
    ...(order.items || []).map(i => i.name || ""),
  ];
  return alanlar.some(a => a.toLocaleLowerCase("tr").includes(ara));
}

const basliklar = ["Zaman", "Sipariş", "Masa", "Ürünler", "Ödeme", "Tutar", ""];

// Geçmiş sekmesi. Veri BaristaPage'den son 7 günün tamamlanmış siparişleri
// olarak geliyor; "Bugün" filtresi ve arama burada istemci tarafında.
export default function HistoryView({ siparisler, onSil }) {
  const [aralik, setAralik] = useState("bugun");
  const [arama, setArama] = useState("");
  const dar = !useMediaQuery("(min-width: 1024px)");

  const baslangic = gunlerOncesi(ARALIKLAR.find(a => a.key === aralik).gun);
  const araliktakiler = siparisler.filter(o => {
    const tarih = tariheCevir(o.createdAt);
    return tarih && tarih >= baslangic;
  });
  const gorunenler = araliktakiler.filter(o => aramayaUyar(o, arama));

  const tutar = (o) => o.totalPrice ?? (o.items || []).reduce((t, i) => t + (i.price || 0) * (i.qty || 0), 0);
  const toplam = (liste) => liste.reduce((t, o) => t + tutar(o), 0);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div role="group" aria-label="Tarih aralığı" style={{ display: "flex", gap: 8 }}>
          {ARALIKLAR.map(a => (
            <Chip key={a.key} aktif={aralik === a.key} onClick={() => setAralik(a.key)}>{a.etiket}</Chip>
          ))}
        </div>
        <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 420, marginLeft: "auto" }}>
          <Search size={18} strokeWidth={2} color="var(--color-text-muted)" aria-hidden="true" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="search"
            value={arama}
            onChange={e => setArama(e.target.value)}
            placeholder="Sipariş kodu, masa ya da ürün ara"
            aria-label="Sipariş kodu, masa ya da ürün ara"
            className="flora-input"
            style={{
              width: "100%", height: 48, boxSizing: "border-box", padding: "0 46px 0 44px",
              borderRadius: "var(--radius-pill)", border: "1px solid var(--color-border)", background: "var(--color-surface)",
              color: "var(--color-text)", fontSize: 15, outline: "none", WebkitAppearance: "none"
            }}
          />
          {arama && (
            <button onClick={() => setArama("")} aria-label="Aramayı temizle" className="flora-tap" style={{
              position: "absolute", right: 2, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%",
              border: "none", background: "transparent", color: "var(--color-text-muted)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <X size={18} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Özet: seçili aralığın tamamı (aramadan bağımsız) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
        <StatTile Icon={Receipt} etiket="Sipariş" deger={araliktakiler.length} />
        <StatTile Icon={Wallet} etiket="Toplam" deger={`${toplam(araliktakiler)} ₺`} />
        <StatTile Icon={Banknote} etiket="Nakit" deger={`${toplam(araliktakiler.filter(o => o.paymentMethod === "nakit"))} ₺`} />
        <StatTile Icon={CreditCard} etiket="Kart" deger={`${toplam(araliktakiler.filter(o => o.paymentMethod === "kart"))} ₺`} />
      </div>

      <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-column)", border: "1px solid var(--color-border-soft)", boxShadow: "var(--shadow-soft)", overflow: "hidden" }}>
        {!dar && (
          <div aria-hidden="true" style={{
            display: "grid", gridTemplateColumns: TABLO_SUTUNLARI, gap: 16, padding: "14px 20px",
            background: "var(--color-surface-alt)", fontSize: 12, fontWeight: 700, letterSpacing: 0.4,
            textTransform: "uppercase", color: "var(--color-text-on-tint)"
          }}>
            {basliklar.map((b, i) => <span key={i}>{b}</span>)}
          </div>
        )}
        {gorunenler.length === 0 ? (
          <p style={{ margin: 0, padding: "40px 20px", textAlign: "center", color: "var(--color-text-muted)", fontSize: 15, fontWeight: 600 }}>
            {arama ? "Aramaya uyan sipariş yok." : aralik === "bugun" ? "Bugün tamamlanmış sipariş yok." : "Son 7 günde tamamlanmış sipariş yok."}
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {gorunenler.map(o => <HistoryRow key={o.id} order={o} onSil={onSil} dar={dar} />)}
          </ul>
        )}
      </div>
    </section>
  );
}
