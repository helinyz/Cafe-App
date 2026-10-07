import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, doc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { Leaf, CreditCard } from "lucide-react";

// Warm Organic müşteri paneli bileşenleri
import HomeHero from "../components/customer/HomeHero";
import SearchFilters, { Chip } from "../components/customer/SearchFilters";
import CategoryHeader from "../components/customer/CategoryHeader";
import ProductCard from "../components/customer/ProductCard";
import BottomActionBar from "../components/customer/BottomActionBar";
import CartSheet from "../components/customer/CartSheet";
import OrderConfirmation from "../components/customer/OrderConfirmation";
import OrderReadyBanner from "../components/customer/OrderReadyBanner";
import AssistantSheet from "../components/customer/AssistantSheet";
import PopularSection from "../components/customer/PopularSection";
import CategoryGrid from "../components/customer/CategoryGrid";

// Dil dosyaları
import { tr } from "../locales/tr";
import { en } from "../locales/en";

// Çevrimdışı sipariş kuyruğu
import { kuyruğaEkle, kuyruğuBoşalt } from "../utils/offlineQueue";
import { playBildirimSesi } from "../utils/bildirimSesi";

// "localhost" yerine 127.0.0.1: bkz. OwnerPage.jsx, bu makinede 8000 portunu
// Docker da IPv6'da dinliyor ve "localhost" yanlış servise çözülebiliyor.
const RECS_API_URL = import.meta.env.VITE_RECS_API_URL || "http://127.0.0.1:8000";

// Müşteri paneli tasarım sistemi ("Warm Organic"): renk/tipografi/şekil
// token'ları src/styles/theme.css'te CSS değişkeni olarak tanımlı.

export default function CustomerPage() {
  const { cafeSlug } = useParams();
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get("masa") || "1";

  const [cafe, setCafe] = useState(null);
  const [cafeId, setCafeId] = useState("");
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [aktifKategori, setAktifKategori] = useState(null); 
  const [sepetAcik, setSepetAcik] = useState(false);
  const [loading, setLoading] = useState(true);
  const [siparisnotu, setSiparisNotu] = useState("");
  const [aramaMetni, setAramaMetni] = useState("");
  const [populerUrunler, setPopulerUrunler] = useState([]);
  const [oneriler, setOneriler] = useState([]);

  // MENÜ ASİSTANI (Faz 3 - RAG)
  const [chatAcik, setChatAcik] = useState(false);
  const [chatMesajlar, setChatMesajlar] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatYukleniyor, setChatYukleniyor] = useState(false);

  // YENİ ÖZELLİK: Gluten Filtresi
  const [glutenFiltre, setGlutenFiltre] = useState(false);

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [sonSiparis, setSonSiparis] = useState(null); // { totalPrice, paymentMethod, items } - onay ekranında gösterilecek

  // SİPARİŞ HAZIR BİLDİRİMİ — sayfa açık kaldığı sürece son verilen siparişin
  // durumunu dinler, barista "completed" işaretleyince banner+ses gösterir.
  const [sonSiparisId, setSonSiparisId] = useState(null);
  const [siparisHazir, setSiparisHazir] = useState(false);

  // KART ÖDEME (simüle) EKRANI
  const [kartOdemeAcik, setKartOdemeAcik] = useState(false);
  const [kartForm, setKartForm] = useState({ no: "", sonKullanma: "", cvv: "" });
  // Sepette seçilen ödeme yöntemi; "Siparişi Onayla" buna göre kart ekranına
  // ya da doğrudan nakit siparişe gidiyor. Varsayılan kart: yanlışlıkla
  // dokunulursa sipariş hemen oluşmasın, önce kart ekranı açılsın.
  const [odemeYontemi, setOdemeYontemi] = useState("kart");

  const [dil, setDil] = useState(localStorage.getItem("kafe_dil") || "tr");
  const t = dil === "tr" ? tr : en;

  const dilDegistir = (yeniDil) => {
    setDil(yeniDil);
    localStorage.setItem("kafe_dil", yeniDil);
  };

  // Büyük harf "İ/I" Türkçe'de dile bağlı davranır (örn. CSS text-transform);
  // <html lang> aktif dile göre güncellenmeli.
  useEffect(() => {
    document.documentElement.lang = dil;
  }, [dil]);

  useEffect(() => {
    const fetchCafe = async () => {
      try {
        const cafesRef = collection(db, "cafes");
        const q = query(cafesRef, where("slug", "==", cafeSlug));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const cafeDoc = snap.docs[0];
          setCafe({ id: cafeDoc.id, ...cafeDoc.data() });
          setCafeId(cafeDoc.id);
          
          const menuRef = collection(db, "cafes", cafeDoc.id, "menu");
          const qMenu = query(menuRef, where("status", "==", "Aktif"));
          return onSnapshot(qMenu, (s) => {
            setMenu(s.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
          });
        }
      } catch (err) { setLoading(false); }
    };
    fetchCafe();
  }, [cafeSlug]);

  useEffect(() => {
    if (cafeId && menu.length > 0) {
      const hesaplaPopuler = async () => {
        const snap = await getDocs(collection(db, "cafes", cafeId, "orders"));
        const sayac = {};
        snap.docs.forEach(d => {
          (d.data().items || []).forEach(item => {
            sayac[item.name] = (sayac[item.name] || 0) + (item.qty || 1);
          });
        });
        const sirali = Object.entries(sayac)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([name]) => menu.find(m => m.name === name))
          .filter(Boolean);
        setPopulerUrunler(sirali);
      };
      hesaplaPopuler();
    }
  }, [cafeId, menu]);

  useEffect(() => {
    if (!cafeId || cart.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sepet boşalınca önerileri temizliyor, idiomatik data-fetching deseni
      setOneriler([]);
      return;
    }
    const cartIds = cart.map(i => i.id).join(",");
    const timer = setTimeout(() => {
      fetch(`${RECS_API_URL}/recommendations/${cafeSlug}?cart_item_ids=${cartIds}`)
        .then(res => res.ok ? res.json() : { items: [] })
        .then(data => setOneriler(data.items || []))
        .catch(() => setOneriler([]));
    }, 400);
    return () => clearTimeout(timer);
  }, [cafeId, cafeSlug, cart]);

  useEffect(() => {
    if (!cafeId) return;
    kuyruğuBoşalt(cafeId, db, addDoc, collection);
    const flushOnReconnect = () => kuyruğuBoşalt(cafeId, db, addDoc, collection);
    window.addEventListener("online", flushOnReconnect);
    return () => window.removeEventListener("online", flushOnReconnect);
  }, [cafeId]);

  useEffect(() => {
    if (!cafeId || !sonSiparisId) return;
    const unsub = onSnapshot(doc(db, "cafes", cafeId, "orders", sonSiparisId), (snap) => {
      if (snap.data()?.status === "completed") {
        setSiparisHazir(true);
        playBildirimSesi();
      }
    });
    return unsub;
  }, [cafeId, sonSiparisId]);

  // YARDIMCI FONKSİYONLAR
  const getKategoriIsmi = (kat) => {
    if (dil === "tr") return kat;
    const urun = menu.find(i => i.category === kat);
    return urun?.categoryEN || kat;
  };

  const glutensizSayisi = (kat) => 
    menu.filter(i => i.available !== false && i.category === kat && i.glutensiz).length;

  const addToCart = (item) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const item = prev.find(i => i.id === itemId);
      if (item?.qty === 1) return prev.filter(i => i.id !== itemId);
      return prev.map(i => i.id === itemId ? { ...i, qty: i.qty - 1 } : i);
    });
  };

  // paymentMethod: "kart" | "nakit", paymentStatus: "odendi" | "beklemede"
  // Kart -> ödeme (simüle) ekranında onaylandığı an "odendi"; nakit -> teslimde
  // tahsil edileceği için "beklemede" olarak siparişle birlikte oluşturulur.
  const gonderSiparis = async (paymentMethod, paymentStatus) => {
    if (cart.length === 0) return;
    const totalPrice = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    const siparisVerisi = {
      tableNumber,
      items: cart.map(i => ({
        name: dil === "tr" ? i.name : (i.nameEN || i.name),
        qty: i.qty,
        price: i.price
      })),
      totalPrice,
      status: "pending",
      not: siparisnotu.trim() || null,
      paymentMethod,
      paymentStatus
    };

    const tamamla = (orderId) => {
      setSonSiparis({ totalPrice, paymentMethod, items: siparisVerisi.items });
      setSonSiparisId(orderId || null);
      setSiparisHazir(false);
      setCart([]);
      setSiparisNotu("");
      setSepetAcik(false);
      setKartOdemeAcik(false);
      setOrderPlaced(true);
    };

    if (!navigator.onLine) {
      kuyruğaEkle(siparisVerisi);
      tamamla(null); // çevrimdışı kuyruğa eklenen sipariş henüz Firestore'da yok, bildirim takip edilemez
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "cafes", cafeId, "orders"), {
        ...siparisVerisi,
        createdAt: serverTimestamp()
      });
      tamamla(docRef.id);
    } catch {
      kuyruğaEkle(siparisVerisi);
      tamamla(null);
    }
  };

  const nakitIleOde = () => gonderSiparis("nakit", "beklemede");
  const kartOdemesiniOnayla = () => gonderSiparis("kart", "odendi");

  const sepettenSiparisVer = () => {
    if (odemeYontemi === "nakit") {
      nakitIleOde();
    } else {
      setSepetAcik(false);
      setKartOdemeAcik(true);
    }
  };

  // metin verilirse (öneri chip'i) onu, verilmezse input'taki soruyu gönderir
  const chatGonder = async (metin) => {
    const soru = (typeof metin === "string" ? metin : chatInput).trim();
    if (!soru || chatYukleniyor) return;
    setChatMesajlar(prev => [...prev, { rol: "kullanici", metin: soru }]);
    setChatInput("");
    setChatYukleniyor(true);
    try {
      const res = await fetch(`${RECS_API_URL}/chat/${cafeSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: soru, lang: dil })
      });
      const data = await res.json();
      setChatMesajlar(prev => [...prev, {
        rol: "asistan",
        metin: data.answer || t.asistanHata,
        urunIdleri: data.mentioned_item_ids || []
      }]);
    } catch {
      setChatMesajlar(prev => [...prev, { rol: "asistan", metin: t.asistanUlasilamiyor }]);
    } finally {
      setChatYukleniyor(false);
    }
  };

  const kategoriListesi = [...new Set(menu.map(i => i.category))].map(kat => ({
    key: kat,
    label: getKategoriIsmi(kat),
    count: menu.filter(i => i.category === kat && i.available !== false).length,
    gfCount: glutensizSayisi(kat),
    imageUrl: menu.find(i => i.category === kat && i.imageUrl)?.imageUrl
  }));
  const heroGorsel = populerUrunler.find(i => i.imageUrl)?.imageUrl || menu.find(i => i.imageUrl)?.imageUrl;
  const sepetAdedi = cart.reduce((a, b) => a + b.qty, 0);
  const sepetToplami = cart.reduce((s, i) => s + (i.price * i.qty), 0);
  const anaSayfa = !aktifKategori && !aramaMetni && !glutenFiltre;
  const aktifKategoriBilgisi = kategoriListesi.find(k => k.key === aktifKategori);
  const listelenenUrunler = menu.filter(i => {
    const matchesCategory = aktifKategori ? i.category === aktifKategori : true;
    const matchesSearch = aramaMetni ? (i.name.toLowerCase().includes(aramaMetni.toLowerCase()) || (i.nameEN && i.nameEN.toLowerCase().includes(aramaMetni.toLowerCase()))) : true;
    const matchesGluten = glutenFiltre ? i.glutensiz === true : true;
    return matchesCategory && matchesSearch && matchesGluten;
  });
  // Kategori görünümünde arama kutusu yok; ana sayfada yazılmış bir arama
  // metni kategori içinde görünmez bir filtre olarak kalmasın.
  const kategoriSec = (kat) => {
    setAramaMetni("");
    setAktifKategori(kat);
  };

  if (loading) return (
    <div className="flora-app" role="status" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <div style={{ display: "flex", gap: 6 }} aria-hidden="true">
        <span className="flora-dot" /><span className="flora-dot" /><span className="flora-dot" />
      </div>
      <p style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--color-text-muted)" }}>{t.yukleniyor}…</p>
    </div>
  );

  if (orderPlaced) return (
    <>
      <OrderReadyBanner gorunur={siparisHazir} onKapat={() => setSiparisHazir(false)} t={t} />
      <OrderConfirmation
        siparis={sonSiparis}
        siparisId={sonSiparisId}
        tableNumber={tableNumber}
        t={t}
        onMenuyeDon={() => setOrderPlaced(false)}
      />
    </>
  );

  // KART ÖDEME (SİMÜLE) EKRANI — bilinçli olarak SADECE form + tek buton
  // içeriyor, başka hiçbir aksiyon yok (geri/iptal dahil). Kart bilgileri
  // hiçbir yere gönderilmiyor/saklanmıyor, sadece bu ekranın kendi state'i.
  if (kartOdemeAcik) {
    const formGecerli = kartForm.no.trim() && kartForm.sonKullanma.trim() && kartForm.cvv.trim();
    const alanStili = {
      width: "100%", height: 52, boxSizing: "border-box", padding: "0 20px",
      borderRadius: "var(--radius-pill)", border: "1px solid var(--color-border)", background: "var(--color-surface)",
      color: "var(--color-text)", fontSize: 15, outline: "none"
    };
    const etiketStili = { display: "block", margin: "0 0 6px 4px", fontSize: 13, fontWeight: 700, color: "var(--color-text)" };
    return (
      <div className="flora-app" style={{ padding: 20, display: "flex", alignItems: "center" }}>
        <div style={{ width: "100%", background: "var(--color-surface)", borderRadius: "var(--radius-card)", padding: 24, border: "1px solid var(--color-border-soft)", boxShadow: "var(--shadow-soft)" }}>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div aria-hidden="true" style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--color-sage-light)", color: "var(--color-sage-deep)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <CreditCard size={24} strokeWidth={1.9} />
            </div>
            <h1 style={{ margin: "0 0 4px", fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 600, color: "var(--color-text)" }}>{t.kartIleOde}</h1>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--color-price)" }}>{sepetToplami} ₺</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 22 }}>
            <div>
              <label htmlFor="kart-no" style={etiketStili}>{t.kartNumarasi}</label>
              <input id="kart-no" inputMode="numeric" autoComplete="off" className="flora-input" value={kartForm.no} onChange={e => setKartForm(f => ({ ...f, no: e.target.value }))} placeholder="0000 0000 0000 0000" style={alanStili} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label htmlFor="kart-skt" style={etiketStili}>{t.sonKullanma}</label>
                <input id="kart-skt" inputMode="numeric" autoComplete="off" className="flora-input" value={kartForm.sonKullanma} onChange={e => setKartForm(f => ({ ...f, sonKullanma: e.target.value }))} placeholder={dil === "tr" ? "AA/YY" : "MM/YY"} style={alanStili} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label htmlFor="kart-cvv" style={etiketStili}>CVV</label>
                <input id="kart-cvv" inputMode="numeric" autoComplete="off" className="flora-input" value={kartForm.cvv} onChange={e => setKartForm(f => ({ ...f, cvv: e.target.value }))} placeholder="123" style={alanStili} />
              </div>
            </div>
          </div>

          <button
            onClick={kartOdemesiniOnayla}
            disabled={!formGecerli}
            className="flora-tap"
            style={{
              width: "100%", minHeight: 56, borderRadius: "var(--radius-pill)", border: "none", fontSize: 16, fontWeight: 700,
              background: formGecerli ? "var(--color-terracotta)" : "var(--color-surface-alt)",
              color: formGecerli ? "#fff" : "var(--color-text-muted)",
              boxShadow: formGecerli ? "var(--shadow-cta)" : "none",
              cursor: formGecerli ? "pointer" : "not-allowed"
            }}
          >
            {t.odemeyiOnayla} · {sepetToplami} ₺
          </button>
          <p style={{ margin: "14px 0 0", fontSize: 12, color: "var(--color-text-muted)", textAlign: "center" }}>{t.simulasyonNotu}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flora-app" style={{ paddingBottom: "calc(112px + env(safe-area-inset-bottom, 0px))" }}>
      <OrderReadyBanner gorunur={siparisHazir} onKapat={() => setSiparisHazir(false)} t={t} />

      {/* ANA SAYFA HERO — kategori görünümünde aşağıdaki başlık kullanılıyor */}
      {!aktifKategori && (
        <HomeHero
          cafeName={cafe?.name}
          tagline={cafe?.tagline || t.slogan}
          tableNumber={tableNumber}
          dil={dil}
          onDilDegistir={dilDegistir}
          heroImageUrl={heroGorsel}
          t={t}
        />
      )}

      {/* KATEGORİ BAŞLIĞI (yapışkan, cam) */}
      {aktifKategori && (
        <CategoryHeader
          baslik={getKategoriIsmi(aktifKategori)}
          count={aktifKategoriBilgisi?.count || 0}
          gfCount={aktifKategoriBilgisi?.gfCount || 0}
          onGeri={() => setAktifKategori(null)}
          cartCount={sepetAdedi}
          onSepetAc={() => setSepetAcik(true)}
          t={t}
        />
      )}

      {/* ARAMA VE FİLTRE CHIP'LERİ — ana sayfada arama + tüm chip'ler,
          kategori içinde sadece Tümü / Glutensiz */}
      {!aktifKategori ? (
        <SearchFilters
          aramaMetni={aramaMetni}
          onAramaDegistir={setAramaMetni}
          glutenFiltre={glutenFiltre}
          onGlutenToggle={() => setGlutenFiltre(!glutenFiltre)}
          aktifKategori={aktifKategori}
          onTumu={() => { setGlutenFiltre(false); setAktifKategori(null); }}
          kategoriler={kategoriListesi}
          onKategoriSec={kategoriSec}
          t={t}
        />
      ) : (
        <div className="flora-scroll-row" role="group" aria-label={t.filtreler} style={{ gap: 8, padding: "16px 20px 4px" }}>
          <Chip aktif={!glutenFiltre} onClick={() => setGlutenFiltre(false)}>{t.tumu}</Chip>
          <Chip aktif={glutenFiltre} onClick={() => setGlutenFiltre(true)}>
            <Leaf size={15} strokeWidth={2.2} aria-hidden="true" /> {t.glutensiz}
          </Chip>
        </div>
      )}

      {/* POPÜLER SEÇİMLER + KATEGORİLER */}
      {anaSayfa && (
        <>
          <PopularSection items={populerUrunler} dil={dil} t={t} cart={cart} onAdd={addToCart} />
          <CategoryGrid kategoriler={kategoriListesi} onSec={kategoriSec} t={t} />
        </>
      )}

      {/* ÜRÜN LİSTESİ (Kategori, Arama veya Gluten Filtresi Aktifse) */}
      {!anaSayfa && (
        <section style={{ padding: "16px 20px 0", display: "flex", flexDirection: "column", gap: 12 }}>
          {!aktifKategori && (
            <h2 style={{ margin: "4px 0 2px", fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600, color: "var(--color-text)" }}>
              {aramaMetni ? t.aramaSonuclari : t.glutensizUrunler}
            </h2>
          )}
          {listelenenUrunler.map(item => (
            <ProductCard
              key={item.id}
              item={item}
              adet={cart.find(c => c.id === item.id)?.qty || 0}
              onEkle={addToCart}
              onCikar={removeFromCart}
              dil={dil}
              t={t}
            />
          ))}
          {listelenenUrunler.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--color-text-muted)", margin: "40px 0" }}>{t.sonucBulunamadi}</p>
          )}
        </section>
      )}

      {/* SEPET */}
      {sepetAcik && (
        <CartSheet
          cart={cart}
          oneriler={oneriler}
          dil={dil}
          t={t}
          tableNumber={tableNumber}
          sepetAdedi={sepetAdedi}
          toplam={sepetToplami}
          not={siparisnotu}
          onNotDegistir={setSiparisNotu}
          odemeYontemi={odemeYontemi}
          onOdemeYontemi={setOdemeYontemi}
          onEkle={addToCart}
          onCikar={removeFromCart}
          onKapat={() => setSepetAcik(false)}
          onOnayla={sepettenSiparisVer}
        />
      )}

      {/* ALT AKSİYON ÇUBUĞU — bir sheet açıkken gizli */}
      {!sepetAcik && !chatAcik && (
        <BottomActionBar
          cartCount={sepetAdedi}
          cartTotal={sepetToplami}
          onAsistanAc={() => setChatAcik(true)}
          onSepetAc={() => setSepetAcik(true)}
          t={t}
        />
      )}

      {/* MENÜ ASİSTANI */}
      {chatAcik && (
        <AssistantSheet
          mesajlar={chatMesajlar}
          yukleniyor={chatYukleniyor}
          input={chatInput}
          onInputDegistir={setChatInput}
          onGonder={chatGonder}
          menu={menu}
          cart={cart}
          onEkle={addToCart}
          dil={dil}
          t={t}
          onKapat={() => setChatAcik(false)}
        />
      )}
    </div>
  );
}
