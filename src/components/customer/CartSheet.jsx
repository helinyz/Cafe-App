import { CreditCard, Banknote, ShoppingBag, Sparkles, Plus } from "lucide-react";
import BottomSheet from "./BottomSheet";
import ImageWithFallback from "./ImageWithFallback";
import { AdetKontrolu } from "./ProductCard";

const urunIsmi = (item, dil) => (dil === "en" ? (item.nameEN || item.name) : item.name);

function AltBaslik({ children }) {
  return <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>{children}</h3>;
}

function SepetSatiri({ item, dil, t, onEkle, onCikar }) {
  const isim = urunIsmi(item, dil);
  return (
    <li style={{
      display: "flex", alignItems: "center", gap: 12, padding: 8,
      background: "var(--color-surface)", borderRadius: 20, border: "1px solid var(--color-border-soft)"
    }}>
      <ImageWithFallback src={item.imageUrl} width={56} height={56} radius={14} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="flora-clamp-2" style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--color-text)", lineHeight: 1.3 }}>{isim}</p>
        <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: "var(--color-price)" }}>{item.price * item.qty} ₺</p>
      </div>
      <AdetKontrolu adet={item.qty} onEkle={() => onEkle(item)} onCikar={() => onCikar(item.id)} urunIsmi={isim} t={t} />
    </li>
  );
}

function OdemeSecici({ secili, onSec, t }) {
  const secenekler = [
    { key: "kart", label: t.kartKisa, Icon: CreditCard },
    { key: "nakit", label: t.nakit, Icon: Banknote },
  ];
  return (
    <div role="radiogroup" aria-label={t.odemeYontemi} style={{ display: "flex", gap: 4, padding: 4, borderRadius: "var(--radius-pill)", background: "var(--color-surface-alt)" }}>
      {secenekler.map(({ key, label, Icon }) => {
        const aktif = secili === key;
        return (
          <button
            key={key}
            role="radio"
            aria-checked={aktif}
            onClick={() => onSec(key)}
            className="flora-tap"
            style={{
              flex: 1, height: 48, border: "none", cursor: "pointer", borderRadius: "var(--radius-pill)",
              background: aktif ? "var(--color-surface)" : "transparent",
              boxShadow: aktif ? "0 6px 16px -8px rgba(43, 33, 28, 0.35)" : "none",
              color: aktif ? "var(--color-text)" : "var(--color-text-muted)",
              fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8
            }}
          >
            <Icon size={18} strokeWidth={2} aria-hidden="true" /> {label}
          </button>
        );
      })}
    </div>
  );
}

export default function CartSheet({
  cart, oneriler, dil, t, tableNumber, sepetAdedi, toplam,
  not, onNotDegistir, odemeYontemi, onOdemeYontemi,
  onEkle, onCikar, onKapat, onOnayla
}) {
  const bos = cart.length === 0;

  const footer = !bos && (
    <>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-muted)" }}>{t.toplam}</span>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 600, color: "var(--color-text)" }}>{toplam} ₺</span>
      </div>
      <button
        onClick={onOnayla}
        className="flora-tap"
        style={{
          width: "100%", minHeight: 56, padding: "0 20px", border: "none", cursor: "pointer",
          borderRadius: "var(--radius-pill)", background: "var(--color-terracotta)", color: "#fff",
          boxShadow: "var(--shadow-cta)", fontSize: 16, fontWeight: 700
        }}
      >
        {t.siparisOnayla} · {toplam} ₺
      </button>
    </>
  );

  return (
    <BottomSheet
      baslik={t.sepetim}
      altBaslik={`${t.masa} ${tableNumber} · ${sepetAdedi} ${sepetAdedi === 1 ? t.urunTekil : t.urun}`}
      onKapat={onKapat}
      kapatEtiketi={t.kapat}
      footer={footer}
    >
      {bos ? (
        <div style={{ textAlign: "center", padding: "36px 24px 48px" }}>
          <div aria-hidden="true" style={{
            width: 64, height: 64, borderRadius: "50%", margin: "0 auto 14px",
            background: "var(--color-sage-light)", color: "var(--color-sage-deep)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <ShoppingBag size={26} strokeWidth={1.8} />
          </div>
          <p style={{ margin: "0 0 4px", fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 600, color: "var(--color-text)" }}>{t.sepetBos}</p>
          <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)" }}>{t.sepetBosAciklama}</p>
        </div>
      ) : (
        <div style={{ padding: "0 20px 20px" }}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {cart.map(item => (
              <SepetSatiri key={item.id} item={item} dil={dil} t={t} onEkle={onEkle} onCikar={onCikar} />
            ))}
          </ul>

          {/* Öneri satırı — mevcut co-occurrence öneri mantığı (Faz 2) */}
          {oneriler.length > 0 && (
            <section style={{ marginTop: 22 }}>
              <AltBaslik>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={15} strokeWidth={2.2} color="var(--color-sage-deep)" aria-hidden="true" /> {t.bunuDaBegen}
                </span>
              </AltBaslik>
              <div className="flora-scroll-row" style={{ gap: 10, margin: "0 -20px", paddingBottom: 4 }}>
                {oneriler.map(item => {
                  const isim = urunIsmi(item, dil);
                  return (
                    <article key={item.id} style={{
                      width: 132, padding: 8, boxSizing: "border-box", borderRadius: 20,
                      background: "var(--color-surface)", border: "1px solid var(--color-border-soft)"
                    }}>
                      <ImageWithFallback src={item.imageUrl} width={116} height={80} radius={14} />
                      <p className="flora-clamp-1" style={{ margin: "8px 2px 8px", fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>{isim}</p>
                      <button
                        onClick={() => onEkle(item)}
                        aria-label={`${t.sepeteEkle}: ${isim}, ${item.price} ₺`}
                        className="flora-tap"
                        style={{
                          width: "100%", height: 44, border: "none", cursor: "pointer", borderRadius: "var(--radius-pill)",
                          background: "var(--color-sage-light)", color: "var(--color-sage-deep)",
                          fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 4
                        }}
                      >
                        <Plus size={15} strokeWidth={2.5} aria-hidden="true" /> {item.price} ₺
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          <section style={{ marginTop: 22 }}>
            <label htmlFor="flora-siparis-notu" style={{ display: "block", margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>
              {t.siparisNotu}
            </label>
            <textarea
              id="flora-siparis-notu"
              value={not}
              onChange={e => onNotDegistir(e.target.value)}
              placeholder={t.notEkle}
              rows={2}
              className="flora-textarea"
              style={{
                width: "100%", boxSizing: "border-box", padding: "14px 18px", resize: "none",
                borderRadius: 22, border: "1px solid var(--color-border)", background: "var(--color-surface)",
                color: "var(--color-text)", fontSize: 14, lineHeight: 1.4, outline: "none"
              }}
            />
          </section>

          <section style={{ marginTop: 22 }}>
            <AltBaslik>{t.odemeYontemi}</AltBaslik>
            <OdemeSecici secili={odemeYontemi} onSec={onOdemeYontemi} t={t} />
          </section>
        </div>
      )}
    </BottomSheet>
  );
}
