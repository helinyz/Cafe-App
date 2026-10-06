import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, doc, serverTimestamp, onSnapshot } from "firebase/firestore";
import {
  Leaf, Bot, X, Send,
  CheckCircle2, Banknote, CreditCard, Bell,
} from "lucide-react";

// Warm Organic müşteri paneli bileşenleri
import HomeHero from "../components/customer/HomeHero";
import SearchFilters, { Chip } from "../components/customer/SearchFilters";
import CategoryHeader from "../components/customer/CategoryHeader";
import ProductCard from "../components/customer/ProductCard";
import BottomActionBar from "../components/customer/BottomActionBar";
import CartSheet from "../components/customer/CartSheet";
import PopularSection from "../components/customer/PopularSection";
import CategoryGrid from "../components/customer/CategoryGrid";

// Dil dosyaları
import { tr } from "../locales/tr";
import { en } from "../locales/en";

// Çevrimdışı sipariş kuyruğu
import { kuyruğaEkle, kuyruğuBoşalt } from "../utils/offlineQueue";

// "localhost" yerine 127.0.0.1: bkz. OwnerPage.jsx, bu makinede 8000 portunu
// Docker da IPv6'da dinliyor ve "localhost" yanlış servise çözülebiliyor.
const RECS_API_URL = import.meta.env.VITE_RECS_API_URL || "http://127.0.0.1:8000";

// Müşteri paneli tasarım sistemi: tek bir sıcak nötr palet + tek vurgu rengi
// (terracotta). Bkz. proje planı — bilinçli olarak sıcak/kahve dükkanı
// hissi verecek şekilde seçildi, soğuk mavi-gri tonlar yerine.
const theme = {
  bg: "#FFFFFF",
  bgSubtle: "#FAFAF9",
  bgMuted: "#F1EFEC",
  border: "#E5E2DD",
  textPrimary: "#211D18",
  textSecondary: "#8A8578",
  textMuted: "#B5AFA4",
  accent: "#B5622A",
  accentSoft: "#F5E6DB",
  accentText: "#8C4A1F",
  success: "#3F7A4C",
  successSoft: "#EAF3EC",
  successBorder: "#CFE3D5",
  radiusSm: 10,
  radiusMd: 18,
  radiusLg: 28,
  shadowSm: "0 2px 10px rgba(33,29,24,0.06)",
  shadowLg: "0 10px 24px rgba(33,29,24,0.14)",
};

// Sipariş hazır bildirimi için kısa bir "bip" sesi — dosya eklemeden
// Web Audio API ile üretiliyor. Tarayıcı ses politikaları nedeniyle
// başarısız olabilir (örn. hiç kullanıcı etkileşimi olmadan), bu yüzden
// sessizce yutuluyor — ses olmasa da görsel banner zaten gösteriliyor.
function playBildirimSesi() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // ses çalınamadı, sorun değil
  }
}

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
  const [sonSiparis, setSonSiparis] = useState(null); // { totalPrice, paymentMethod } - sonuç ekranında gösterilecek

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
      setSonSiparis({ totalPrice, paymentMethod });
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

  const chatGonder = async () => {
    const soru = chatInput.trim();
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
      setChatMesajlar(prev => [...prev, { rol: "asistan", metin: data.answer || (dil === "tr" ? "Bir hata oluştu." : "Something went wrong.") }]);
    } catch {
      setChatMesajlar(prev => [...prev, { rol: "asistan", metin: dil === "tr" ? "Asistana şu an ulaşılamıyor." : "Can't reach the assistant right now." }]);
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

  if (loading) return <div style={{ textAlign: "center", padding: 50, fontWeight: 700 }}>{t.yukleniyor}...</div>;

  if (orderPlaced) return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 24, minHeight: "100vh", background: theme.bgSubtle }}>
      <SiparisHazirBanner siparisHazir={siparisHazir} onKapat={() => setSiparisHazir(false)} dil={dil} theme={theme} />
      <div style={{ background: theme.bg, borderRadius: theme.radiusLg, padding: 30, textAlign: "center", border: `1px solid ${theme.border}`, boxShadow: theme.shadowSm, marginBottom: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: theme.successSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <CheckCircle2 size={32} strokeWidth={2} color={theme.success} />
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: 21, fontWeight: 700, color: theme.textPrimary }}>{t.siparisAlindi}</h2>
        <p style={{ color: theme.textSecondary, margin: 0, fontSize: 15 }}>{t.siparisAlindiAciklama}</p>
      </div>

      {sonSiparis?.paymentMethod === "kart" && (
        <div style={{ background: theme.successSoft, borderRadius: theme.radiusLg, padding: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <CreditCard size={19} strokeWidth={2} color={theme.success} />
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: theme.success }}>
            {dil === "tr" ? "Ödemeniz alındı, siparişiniz hazırlanıyor." : "Payment received, your order is being prepared."}
          </p>
        </div>
      )}

      {sonSiparis?.paymentMethod === "nakit" && (
        <div style={{ background: theme.accentSoft, borderRadius: theme.radiusLg, padding: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Banknote size={19} strokeWidth={2} color={theme.accentText} />
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: theme.accentText }}>
            {dil === "tr"
              ? `Siparişiniz alındı, hazır olduğunda ${sonSiparis.totalPrice} ₺ nakit ödemesi ile teslim alacaksınız.`
              : `Your order is received — you'll pay ${sonSiparis.totalPrice} ₺ in cash when it's delivered.`}
          </p>
        </div>
      )}

      <button onClick={() => setOrderPlaced(false)} style={{ width: "100%", marginTop: 20, background: "none", border: "none", color: theme.textSecondary, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
        {t.menuyeDon || "Menüye Geri Dön"}
      </button>
    </div>
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
      <SiparisHazirBanner siparisHazir={siparisHazir} onKapat={() => setSiparisHazir(false)} dil={dil} theme={theme} />

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

      {/* MENÜ ASİSTANI PANELİ */}
      {chatAcik && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(33,29,24,0.55)", zIndex: 300, display: "flex", alignItems: "flex-end" }} onClick={() => setChatAcik(false)}>
          <div style={{ background: theme.bg, width: "100%", borderTopLeftRadius: theme.radiusLg, borderTopRightRadius: theme.radiusLg, padding: "20px 20px 24px", maxHeight: "75vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: theme.border, borderRadius: 2, margin: "-10px auto 14px" }}></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: 17, color: theme.textPrimary, display: "flex", alignItems: "center", gap: 7 }}>
                <Bot size={18} strokeWidth={2} color={theme.accent} /> {dil === "tr" ? "Menü Asistanı" : "Menu Assistant"}
              </h2>
              <button onClick={() => setChatAcik(false)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, display: "flex" }}>
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", marginBottom: 12, minHeight: 120 }}>
              {chatMesajlar.length === 0 && (
                <p style={{ color: theme.textSecondary, fontSize: 13, textAlign: "center", marginTop: 20 }}>
                  {dil === "tr" ? "Menü, fiyat veya glutensiz seçenekler hakkında soru sorabilirsin." : "Ask about the menu, prices, or gluten-free options."}
                </p>
              )}
              {chatMesajlar.map((m, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: m.rol === "kullanici" ? "flex-end" : "flex-start", marginBottom: 8 }}>
                  <div style={{
                    maxWidth: "80%", padding: "10px 14px", borderRadius: theme.radiusSm, fontSize: 14,
                    background: m.rol === "kullanici" ? theme.textPrimary : theme.bgMuted,
                    color: m.rol === "kullanici" ? "#fff" : theme.textPrimary
                  }}>
                    {m.metin}
                  </div>
                </div>
              ))}
              {chatYukleniyor && (
                <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8 }}>
                  <div style={{ padding: "10px 14px", borderRadius: theme.radiusSm, fontSize: 14, background: theme.bgMuted, color: theme.textSecondary }}>
                    {dil === "tr" ? "yazıyor..." : "typing..."}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && chatGonder()}
                placeholder={dil === "tr" ? "Bir soru sor..." : "Ask a question..."}
                style={{ flex: 1, padding: "12px 14px", borderRadius: theme.radiusSm, border: `1px solid ${theme.border}`, outline: "none", fontSize: 14, boxSizing: "border-box", color: theme.textPrimary }}
              />
              <button onClick={chatGonder} disabled={chatYukleniyor} style={{ width: 44, borderRadius: theme.radiusSm, background: theme.accent, color: "#fff", border: "none", cursor: chatYukleniyor ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: chatYukleniyor ? 0.6 : 1 }}>
                <Send size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SiparisHazirBanner({ siparisHazir, onKapat, dil, theme }) {
  if (!siparisHazir) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 500,
      background: theme.accent, color: "#fff", padding: "14px 20px",
      display: "flex", alignItems: "center", gap: 10, boxShadow: theme.shadowLg
    }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Bell size={16} strokeWidth={2.2} />
      </div>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, flex: 1 }}>
        {dil === "tr" ? "☕ Siparişiniz hazır!" : "☕ Your order is ready!"}
      </p>
      <button onClick={onKapat} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", flexShrink: 0, opacity: 0.85 }}>
        <X size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
