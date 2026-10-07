import { useEffect, useRef } from "react";
import { Sparkles, Send, Plus } from "lucide-react";
import BottomSheet from "./BottomSheet";
import ImageWithFallback from "./ImageWithFallback";

function Balon({ kullanici, children }) {
  return (
    <div style={{ display: "flex", justifyContent: kullanici ? "flex-end" : "flex-start" }}>
      <div style={{
        maxWidth: "82%", padding: "11px 15px", fontSize: 14, lineHeight: 1.45, overflowWrap: "anywhere",
        borderRadius: kullanici ? "20px 20px 6px 20px" : "20px 20px 20px 6px",
        background: kullanici ? "var(--color-text)" : "var(--color-surface)",
        color: kullanici ? "var(--color-bg)" : "var(--color-text)",
        border: kullanici ? "none" : "1px solid var(--color-border-soft)"
      }}>
        {children}
      </div>
    </div>
  );
}

// Asistan cevabında adı geçen ürünler (backend'in mentioned_item_ids alanı)
// mini kart olarak gösteriliyor; + ile doğrudan sepete eklenebiliyor.
function UrunKartlari({ urunler, dil, t, cart, onEkle }) {
  if (!urunler.length) return null;
  return (
    <div className="flora-scroll-row" style={{ gap: 8, margin: "8px -20px 0", paddingBottom: 2 }}>
      {urunler.map(item => {
        const isim = dil === "en" ? (item.nameEN || item.name) : item.name;
        const adet = cart.find(c => c.id === item.id)?.qty || 0;
        return (
          <article key={item.id} style={{
            width: 210, display: "flex", alignItems: "center", gap: 10, padding: 6, boxSizing: "border-box",
            background: "var(--color-surface)", borderRadius: 18, border: "1px solid var(--color-border-soft)"
          }}>
            <ImageWithFallback src={item.imageUrl} width={48} height={48} radius={12} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="flora-clamp-1" style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>{isim}</p>
              <p style={{ margin: "1px 0 0", fontSize: 13, fontWeight: 700, color: "var(--color-price)" }}>{item.price} ₺</p>
            </div>
            <button
              onClick={() => onEkle(item)}
              aria-label={`${t.sepeteEkle}: ${isim}`}
              className="flora-tap"
              style={{
                position: "relative", width: 44, height: 44, borderRadius: "50%", border: "none", flexShrink: 0, cursor: "pointer",
                background: "var(--color-terracotta)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center"
              }}
            >
              <Plus size={18} strokeWidth={2.4} />
              {adet > 0 && (
                <span key={adet} className="flora-pop-in" style={{
                  position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 4px", boxSizing: "border-box",
                  borderRadius: "var(--radius-pill)", background: "var(--color-text)", color: "#fff",
                  border: "2px solid var(--color-surface)", fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>{adet}</span>
              )}
            </button>
          </article>
        );
      })}
    </div>
  );
}

export default function AssistantSheet({ mesajlar, yukleniyor, input, onInputDegistir, onGonder, menu, cart, onEkle, dil, t, onKapat }) {
  const listeSonu = useRef(null);

  // Yeni mesaj ya da "yazıyor" göstergesi gelince en alta kaydır
  useEffect(() => {
    listeSonu.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [mesajlar.length, yukleniyor]);

  const avatar = (
    <span aria-hidden="true" style={{
      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
      background: "var(--color-sage-light)", color: "var(--color-sage-deep)",
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <Sparkles size={20} strokeWidth={2.1} />
    </span>
  );

  const footer = (
    <>
      <div className="flora-scroll-row" style={{ gap: 8, margin: "0 -20px 10px" }}>
        {t.asistanOneriler.map(soru => (
          <button
            key={soru}
            onClick={() => onGonder(soru)}
            disabled={yukleniyor}
            className="flora-tap"
            style={{
              height: 44, padding: "0 16px", borderRadius: "var(--radius-pill)", whiteSpace: "nowrap",
              border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)",
              fontSize: 13, fontWeight: 600, cursor: yukleniyor ? "default" : "pointer", opacity: yukleniyor ? 0.6 : 1
            }}
          >
            {soru}
          </button>
        ))}
      </div>
      <form
        onSubmit={e => { e.preventDefault(); onGonder(); }}
        style={{ display: "flex", gap: 8, alignItems: "center" }}
      >
        <input
          value={input}
          onChange={e => onInputDegistir(e.target.value)}
          placeholder={t.soruSor}
          aria-label={t.soruSor}
          className="flora-input"
          style={{
            flex: 1, minWidth: 0, height: 50, boxSizing: "border-box", padding: "0 20px",
            borderRadius: "var(--radius-pill)", border: "1px solid var(--color-border)", background: "var(--color-bg)",
            color: "var(--color-text)", fontSize: 15, outline: "none"
          }}
        />
        <button
          type="submit"
          disabled={yukleniyor || !input.trim()}
          aria-label={t.gonder}
          className="flora-tap"
          style={{
            width: 50, height: 50, borderRadius: "50%", border: "none", flexShrink: 0,
            background: "var(--color-terracotta)", color: "#fff", boxShadow: "var(--shadow-cta)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: yukleniyor || !input.trim() ? "default" : "pointer",
            opacity: yukleniyor || !input.trim() ? 0.55 : 1
          }}
        >
          <Send size={19} strokeWidth={2.2} />
        </button>
      </form>
    </>
  );

  return (
    <BottomSheet
      baslik={t.menuAsistani}
      altBaslik={t.menuAsistaniAlt}
      solIkon={avatar}
      onKapat={onKapat}
      kapatEtiketi={t.kapat}
      footer={footer}
      yukseklik="92vh"
    >
      <div aria-live="polite" style={{ padding: "4px 20px 16px", display: "flex", flexDirection: "column", gap: 10, minHeight: "45vh" }}>
        <Balon kullanici={false}>{t.asistanKarsilama}</Balon>

        {mesajlar.map((m, idx) => {
          const kullanici = m.rol === "kullanici";
          const urunler = (m.urunIdleri || []).map(id => menu.find(i => i.id === id)).filter(Boolean);
          return (
            <div key={idx} className="flora-fade-up">
              <Balon kullanici={kullanici}>{m.metin}</Balon>
              {!kullanici && <UrunKartlari urunler={urunler} dil={dil} t={t} cart={cart} onEkle={onEkle} />}
            </div>
          );
        })}

        {yukleniyor && (
          <div role="status" aria-label={t.asistanYaziyor} style={{ display: "flex" }}>
            <div style={{
              display: "flex", gap: 5, alignItems: "center", padding: "14px 16px",
              background: "var(--color-surface)", border: "1px solid var(--color-border-soft)", borderRadius: "20px 20px 20px 6px"
            }}>
              <span className="flora-dot" /><span className="flora-dot" /><span className="flora-dot" />
            </div>
          </div>
        )}
        <div ref={listeSonu} />
      </div>
    </BottomSheet>
  );
}
