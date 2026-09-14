import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";

// Dil dosyaları
import { tr } from "../locales/tr";
import { en } from "../locales/en";

// Çevrimdışı sipariş kuyruğu
import { kuyruğaEkle, kuyruğuBoşalt } from "../utils/offlineQueue";

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

  // YENİ ÖZELLİK: Gluten Filtresi
  const [glutenFiltre, setGlutenFiltre] = useState(false);

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [hesapIstendi, setHesapIstendi] = useState(false);
  const [odemeYontemi, setOdemeYontemi] = useState(null);

  const [dil, setDil] = useState(localStorage.getItem("kafe_dil") || "tr");
  const t = dil === "tr" ? tr : en;

  const dilDegistir = (yeniDil) => {
    setDil(yeniDil);
    localStorage.setItem("kafe_dil", yeniDil);
  };

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
    if (!cafeId) return;
    kuyruğuBoşalt(cafeId, db, addDoc, collection);
    const flushOnReconnect = () => kuyruğuBoşalt(cafeId, db, addDoc, collection);
    window.addEventListener("online", flushOnReconnect);
    return () => window.removeEventListener("online", flushOnReconnect);
  }, [cafeId]);

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

  const placeOrder = async () => {
    if (cart.length === 0) return;
    const siparisVerisi = {
      tableNumber,
      items: cart.map(i => ({
        name: dil === "tr" ? i.name : (i.nameEN || i.name),
        qty: i.qty,
        price: i.price
      })),
      totalPrice: cart.reduce((s, i) => s + (i.price * i.qty), 0),
      status: "pending",
      not: siparisnotu.trim() || null
    };

    if (!navigator.onLine) {
      kuyruğaEkle(siparisVerisi);
      setCart([]);
      setSepetAcik(false);
      setOrderPlaced(true);
      return;
    }

    try {
      await addDoc(collection(db, "cafes", cafeId, "orders"), {
        ...siparisVerisi,
        createdAt: serverTimestamp()
      });
      setCart([]);
      setSepetAcik(false);
      setOrderPlaced(true);
    } catch {
      kuyruğaEkle(siparisVerisi);
      setCart([]);
      setSepetAcik(false);
      setOrderPlaced(true);
    }
  };

  const hesapIste = async () => {
    if (!odemeYontemi) return;
    try {
      await addDoc(collection(db, "cafes", cafeId, "orders"), {
        tableNumber,
        status: "hesap",
        createdAt: serverTimestamp(),
        items: [],
        totalPrice: 0,
        tip: "hesap_istegi",
        odemeYontemi
      });
      setHesapIstendi(true);
    } catch (err) { alert("Hesap hatası!"); }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 50, fontWeight: 700 }}>{t.yukleniyor}...</div>;

  if (orderPlaced) return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 24, minHeight: "100vh", background: "#f9f9f9", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: 30, textAlign: "center", border: "1px solid #f0f0f0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: 20 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800 }}>{t.siparisAlindi}</h2>
        <p style={{ color: "#6b7280", margin: 0, fontSize: 15 }}>{t.siparisAlindiAciklama}</p>
      </div>

      <div style={{ background: "#fff", borderRadius: 24, padding: 24, border: "1px solid #f0f0f0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <p style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#111" }}>{t.hesapBaslik}</p>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "#6b7280" }}>{t.hesapAciklama}</p>

        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {[{ id: "nakit", label: t.nakit, emoji: "💵" }, { id: "kart", label: t.kart, emoji: "💳" }].map(yontem => (
            <button key={yontem.id} onClick={() => setOdemeYontemi(yontem.id)} style={{ flex: 1, padding: "16px 8px", borderRadius: 16, cursor: "pointer", border: odemeYontemi === yontem.id ? "2px solid #111" : "2px solid #f0f0f0", background: odemeYontemi === yontem.id ? "#111" : "#fff", color: odemeYontemi === yontem.id ? "#fff" : "#4b5563", fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 28 }}>{yontem.emoji}</span> {yontem.label}
            </button>
          ))}
        </div>

        {!hesapIstendi ? (
          <button onClick={hesapIste} disabled={!odemeYontemi} style={{ width: "100%", padding: 18, borderRadius: 18, background: odemeYontemi ? "#111" : "#e5e7eb", color: "#fff", border: "none", fontSize: 16, fontWeight: 800, cursor: odemeYontemi ? "pointer" : "not-allowed" }}>
            {t.hesapIste}
          </button>
        ) : (
          <div style={{ textAlign: "center", padding: 15, background: "#f0fdf4", borderRadius: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔔</div>
            <p style={{ margin: 0, fontWeight: 800, color: "#166534" }}>{t.hesapYolda}</p>
            <p style={{ margin: 0, fontSize: 13, color: "#16a34a" }}>{t.hesapYoldaAciklama}</p>
          </div>
        )}
        
        <button onClick={() => setOrderPlaced(false)} style={{ width: "100%", marginTop: 15, background: "none", border: "none", color: "#6b7280", fontWeight: 600, fontSize: 14 }}>
          {t.menuyeDon || "Menüye Geri Dön"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", background: "#fff", minHeight: "100vh", paddingBottom: 120, fontFamily: "-apple-system, sans-serif" }}>
      
      {/* HEADER */}
      <div style={{ padding: "16px 20px", position: "sticky", top: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)", zIndex: 10, borderBottom: "1px solid #f2f2f2" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {aktifKategori && <button onClick={() => setAktifKategori(null)} style={{ background: "none", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13, marginBottom: 4, display: "block" }}>← {t.geriDon}</button>}
            {!aktifKategori && <p style={{ margin: 0, fontSize: 10, color: "#9ca3af", fontWeight: 800, letterSpacing: 0.5 }}>{t.hosgeldin?.toUpperCase()}</p>}
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{cafe?.name}</h1>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 99, padding: 3 }}>
              {["tr", "en"].map(d => (
                <button key={d} onClick={() => dilDegistir(d)} style={{ padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer", background: dil === d ? "#111" : "transparent", color: dil === d ? "#fff" : "#666", fontSize: 10, fontWeight: 800 }}>
                  {d.toUpperCase()}
                </button>
              ))}
            </div>
            <div style={{ background: "#111", color: "#fff", padding: "8px 12px", borderRadius: 12, fontWeight: 800, fontSize: 12 }}>M {tableNumber}</div>
          </div>
        </div>
      </div>

      {/* ARAMA VE GLUTEN FİLTRE ÇUBUĞU */}
      <div style={{ display: "flex", gap: 10, padding: "12px 16px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔍</span>
            <input 
              value={aramaMetni} 
              onChange={e => setAramaMetni(e.target.value)} 
              placeholder={t.arama} 
              style={{ width: "100%", boxSizing: "border-box", padding: "14px 14px 14px 40px", borderRadius: 16, border: "1px solid #f0f0f0", outline: "none", background: "#f9fafb", fontSize: 15 }} 
            />
          </div>
          
          <button
            onClick={() => setGlutenFiltre(!glutenFiltre)}
            style={{
              flexShrink: 0, padding: "0 16px", borderRadius: 16, border: "2px solid",
              borderColor: glutenFiltre ? "#16a34a" : "#f0f0f0",
              background: glutenFiltre ? "#f0fdf4" : "#fff",
              cursor: "pointer", fontSize: 13, fontWeight: 800,
              color: glutenFiltre ? "#15803d" : "#888",
              display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s"
            }}>
            🌾 {dil === "tr" ? "Glutensiz" : "G-Free"}
          </button>
      </div>

      {/* POPÜLER ÜRÜNLER */}
      {!aktifKategori && !aramaMetni && !glutenFiltre && populerUrunler.length > 0 && (
        <div style={{ padding: "0 16px 20px" }}>
          <p style={{ margin: "10px 0", fontSize: 17, fontWeight: 800 }}>🔥 {t.populer}</p>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 10, scrollbarWidth: "none" }}>
            {populerUrunler.map(item => (
              <div key={item.id} onClick={() => addToCart(item)} style={{ minWidth: 140, background: "#fff", borderRadius: 20, border: "1px solid #f3f4f6", padding: 10, textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", position: "relative" }}>
                {item.glutensiz && <span style={{ position: "absolute", top: 8, right: 8, fontSize: 14 }}>🌾</span>}
                <img src={item.imageUrl} style={{ width: 80, height: 80, borderRadius: 15, objectFit: "cover", marginBottom: 8 }} alt="" />
                <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700 }}>{dil === "en" ? (item.nameEN || item.name) : item.name}</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#111" }}>{item.price} ₺</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KATEGORİ LİSTESİ */}
      {!aktifKategori && !aramaMetni && !glutenFiltre && (
        <div style={{ padding: "0 15px", display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ margin: "5px 0 0", fontSize: 17, fontWeight: 800 }}>📁 {t.kategoriler}</p>
          {[...new Set(menu.map(i => i.category))].map(kat => (
            <div key={kat} onClick={() => setAktifKategori(kat)} style={{ height: 140, borderRadius: 28, position: "relative", overflow: "hidden", cursor: "pointer", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
              <img src={menu.find(i => i.category === kat)?.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent 70%)" }} />
              <div style={{ position: "absolute", bottom: 20, left: 24, right: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <h2 style={{ color: "#fff", margin: 0, fontSize: 22, fontWeight: 800 }}>{getKategoriIsmi(kat)}</h2>
                  <p style={{ color: "rgba(255,255,255,0.8)", margin: "4px 0 0", fontSize: 12 }}>
                    {menu.filter(i => i.category === kat && i.available !== false).length} {t.urun}
                    {glutensizSayisi(kat) > 0 && (
                      <span style={{ marginLeft: 8, background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: 99, fontSize: 11 }}>
                        🌾 {glutensizSayisi(kat)} {dil === "tr" ? "glutensiz" : "gf"}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ÜRÜN LİSTESİ (Kategori, Arama veya Gluten Filtresi Aktifse) */}
      {(aktifKategori || aramaMetni || glutenFiltre) && (
        <div style={{ padding: "0 15px", display: "flex", flexDirection: "column", gap: 12 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 5, marginTop: 10 }}>
            {aramaMetni ? `${t.arama}: ${aramaMetni}` : glutenFiltre && !aktifKategori ? (dil === "tr" ? "Glutensiz Ürünler" : "Gluten-Free Items") : getKategoriIsmi(aktifKategori)}
          </h3>
          {menu
            .filter(i => {
              const matchesCategory = aktifKategori ? i.category === aktifKategori : true;
              const matchesSearch = aramaMetni ? (i.name.toLowerCase().includes(aramaMetni.toLowerCase()) || (i.nameEN && i.nameEN.toLowerCase().includes(aramaMetni.toLowerCase()))) : true;
              const matchesGluten = glutenFiltre ? i.glutensiz === true : true;
              return matchesCategory && matchesSearch && matchesGluten;
            })
            .map(item => (
              <UrunKarti key={item.id} item={item} cart={cart} addToCart={addToCart} removeFromCart={removeFromCart} dil={dil} />
            ))}
            
          {menu.filter(i => {
              const matchesCategory = aktifKategori ? i.category === aktifKategori : true;
              const matchesSearch = aramaMetni ? (i.name.toLowerCase().includes(aramaMetni.toLowerCase()) || (i.nameEN && i.nameEN.toLowerCase().includes(aramaMetni.toLowerCase()))) : true;
              const matchesGluten = glutenFiltre ? i.glutensiz === true : true;
              return matchesCategory && matchesSearch && matchesGluten;
          }).length === 0 && (
            <p style={{ textAlign: "center", color: "#9ca3af", marginTop: 40 }}>{dil === "tr" ? "Ürün bulunamadı." : "No items found."}</p>
          )}
        </div>
      )}

      {/* ALT BAR (HESAP VE SEPET) */}
      <div style={{ position: "fixed", bottom: 25, left: 20, right: 20, display: "flex", gap: 12, zIndex: 100 }}>
        <button 
          onClick={() => setOrderPlaced(true)} 
          style={{ flex: 1, padding: "18px", borderRadius: 22, background: "#fff", border: "2px solid #111", fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "0 8px 20px rgba(0,0,0,0.1)" }}
        >
          {t.hesap || "Hesap"}
        </button>
        
        {cart.length > 0 && (
          <button onClick={() => setSepetAcik(true)} style={{ flex: 2, padding: "18px", borderRadius: 22, background: "#111", color: "#fff", fontWeight: 800, display: "flex", justifyContent: "space-between", fontSize: 14, cursor: "pointer", boxShadow: "0 8px 20px rgba(0,0,0,0.2)" }}>
            <span>{cart.reduce((a, b) => a + b.qty, 0)} {t.urun}</span>
            <span>{cart.reduce((a, b) => a + (b.price * b.qty), 0)} ₺</span>
          </button>
        )}
      </div>

      {/* SEPET MODAL */}
      {sepetAcik && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={() => setSepetAcik(false)}>
          <div style={{ background: "#fff", width: "100%", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: "30px 25px 40px", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: "#e5e7eb", borderRadius: 2, margin: "-10px auto 20px" }}></div>
            <h2 style={{ marginBottom: 25, fontWeight: 900, fontSize: 24 }}>{t.sepetim}</h2>
            {cart.map(i => (
              <div key={i.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 15, alignItems: "center" }}>
                <div style={{ fontWeight: 600 }}>{i.qty}x {dil === "en" ? (i.nameEN || i.name) : i.name}</div>
                <div style={{ fontWeight: 800 }}>{i.price * i.qty} ₺</div>
              </div>
            ))}
            <textarea placeholder={t.notEkle} value={siparisnotu} onChange={e => setSiparisNotu(e.target.value)} style={{ width: "100%", padding: 15, borderRadius: 18, margin: "20px 0", background: "#f3f4f6", border: "none", outline: "none", fontSize: 14, boxSizing: "border-box" }} />
            <button onClick={placeOrder} style={{ width: "100%", background: "#111", color: "#fff", padding: "20px", borderRadius: 22, fontWeight: 800, fontSize: 16, cursor: "pointer" }}>{t.siparisOnayla}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function UrunKarti({ item, cart, addToCart, removeFromCart, dil }) {
  const inCart = cart.find(c => c.id === item.id);
  const urunIsmi = dil === "en" && item.nameEN ? item.nameEN : item.name;
  const urunAciklama = dil === "en" && item.descriptionEN ? item.descriptionEN : item.description;

  return (
    <div style={{ display: "flex", gap: 15, padding: 14, background: "#fff", border: "1px solid #f3f4f6", borderRadius: 24, alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
      <img src={item.imageUrl} style={{ width: 85, height: 85, borderRadius: 18, objectFit: "cover" }} alt="" />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{urunIsmi}</h4>
          {item.glutensiz && (
            <span style={{ fontSize: 9, background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", padding: "1px 6px", borderRadius: 6, fontWeight: 800, whiteSpace: "nowrap" }}>
              🌾 {dil === "tr" ? "GLUTENSİZ" : "G-FREE"}
            </span>
          )}
        </div>
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#9ca3af", lineHeight: "1.4" }}>{urunAciklama}</p>
        <strong style={{ fontSize: 16, fontWeight: 800 }}>{item.price} ₺</strong>
      </div>
      
      {!inCart ? (
        <button onClick={() => addToCart(item)} style={{ background: "#111", color: "#fff", border: "none", width: 40, height: 40, borderRadius: 14, cursor: "pointer", fontSize: 20, fontWeight: 700 }}>+</button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f3f4f6", padding: "5px", borderRadius: 14 }}>
          <button onClick={() => removeFromCart(item.id)} style={{ width: 30, height: 30, borderRadius: 10, border: "none", background: "#fff", fontWeight: 700, cursor: "pointer" }}>-</button>
          <span style={{ fontWeight: 800, fontSize: 14, minWidth: 20, textAlign: "center" }}>{inCart.qty}</span>
          <button onClick={() => addToCart(item)} style={{ width: 30, height: 30, borderRadius: 10, border: "none", background: "#111", color: "#fff", fontWeight: 700, cursor: "pointer" }}>+</button>
        </div>
      )}
    </div>
  );
}