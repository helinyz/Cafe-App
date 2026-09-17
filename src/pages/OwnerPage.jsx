import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, updateDoc, orderBy, onSnapshot } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { QRCodeCanvas } from "qrcode.react";

const BASE_URL = window.location.origin; // Localhost veya domain neyse onu otomatik alır
// "localhost" yerine 127.0.0.1: bu makinede 8000 portunu Docker da IPv6'da
// dinliyor, "localhost" tarayıcıda IPv6'ya çözülünce yanlış servise çarpıyordu.
const FORECAST_API_URL = import.meta.env.VITE_FORECAST_API_URL || "http://127.0.0.1:8000";

const theme = {
  fontSans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  bgPrimary: "#ffffff",
  bgSecondary: "#f9fafb",
  borderPrimary: "#e5e7eb",
  borderTertiary: "#f3f4f6",
  textPrimary: "#111111",
  textSecondary: "#6b7280",
  brandColor: "#111111",
  bgSuccess: "#f0fdf4",
  textSuccess: "#15803d",
  borderSuccess: "#bbf7d0",
  bgDanger: "#fef2f2",
  textDanger: "#b91c1c",
  borderDanger: "#fecaca",
  radiusMd: "8px",
  radiusLg: "12px",
  radiusXl: "16px",
};

export default function OwnerPage() {
  const [user, setUser] = useState(null);
  const [aktifSekme, setAktifSekme] = useState("menu");
  const [cafeName, setCafeName] = useState("");
  const [cafeSlug, setCafeSlug] = useState("");
  const [cafeId, setCafeId] = useState("");
  const [menu, setMenu] = useState([]);
  const [siparisler, setSiparisler] = useState([]);
  const [loading, setLoading] = useState(false);
  const [seciliMasa, setSeciliMasa] = useState(1);

  // FORM STATES
  const [itemName, setItemName] = useState("");
  const [itemNameEN, setItemNameEN] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemCategoryEN, setItemCategoryEN] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemDescriptionEN, setItemDescriptionEN] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [itemGlutensiz, setItemGlutensiz] = useState(false); // <-- YENİ
  
  const [editingId, setEditingId] = useState(null);

  // TAHMİN (Faz 1) STATES
  const [forecastMetric, setForecastMetric] = useState("item_count");
  const [forecastData, setForecastData] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState("");

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchCafeAndData(currentUser.uid);
      } else {
        setUser(null);
      }
    });
    return unsubAuth;
  }, []);

  const fetchCafeAndData = async (uid) => {
    try {
      const q = query(collection(db, "cafes"), where("ownerId", "==", uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const cafeDoc = snap.docs[0];
        setCafeId(cafeDoc.id);
        setCafeName(cafeDoc.data().name);
        setCafeSlug(cafeDoc.data().slug);
        listenToMenu(cafeDoc.id);
        listenToOrders(cafeDoc.id);
      }
    } catch (err) { console.error(err); }
  };

  const listenToMenu = (cId) => {
    const q = collection(db, "cafes", cId, "menu");
    return onSnapshot(q, (snap) => {
      setMenu(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  };

  const listenToOrders = (cId) => {
    const q = query(collection(db, "cafes", cId, "orders"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setSiparisler(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!itemName || !itemPrice) return;
    setLoading(true);
    
    const itemData = {
      name: itemName,
      nameEN: itemNameEN || itemName,
      price: Number(itemPrice),
      category: itemCategory || "Genel",
      categoryEN: itemCategoryEN || itemCategory || "General",
      description: itemDescription || "",
      descriptionEN: itemDescriptionEN || itemDescription || "",
      imageUrl: itemImageUrl || "",
      glutensiz: itemGlutensiz, // <-- YENİ
      status: "Aktif",
      available: true
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "cafes", cafeId, "menu", editingId), itemData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, "cafes", cafeId, "menu"), itemData);
      }
      
      // Formu temizle
      resetForm();
    } catch (err) {
      console.error("Hata:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setItemName(""); setItemNameEN("");
    setItemPrice("");
    setItemCategory(""); setItemCategoryEN("");
    setItemDescription(""); setItemDescriptionEN("");
    setItemImageUrl("");
    setItemGlutensiz(false); // <-- SIFIRLA
    setEditingId(null);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setItemName(item.name || "");
    setItemNameEN(item.nameEN || "");
    setItemPrice(item.price || "");
    setItemCategory(item.category || "");
    setItemCategoryEN(item.categoryEN || "");
    setItemDescription(item.description || "");
    setItemDescriptionEN(item.descriptionEN || "");
    setItemImageUrl(item.imageUrl || "");
    setItemGlutensiz(item.glutensiz || false); // <-- DÜZENLEME MODUNA AL
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bu ürünü silmek istediğine emin misin?")) {
      await deleteDoc(doc(db, "cafes", cafeId, "menu", id));
    }
  };

  useEffect(() => {
    if (aktifSekme !== "tahmin" || !cafeSlug) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- veri çekimi başlarken loading/error state'i sıfırlanıyor, idiomatik data-fetching deseni
    setForecastLoading(true);
    setForecastError("");
    fetch(`${FORECAST_API_URL}/forecast/${cafeSlug}?metric=${forecastMetric}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `Sunucu hatası (${res.status})`);
        }
        return res.json();
      })
      .then((data) => { if (!cancelled) setForecastData(data); })
      .catch((err) => { if (!cancelled) setForecastError(err.message || "Tahmin servisine ulaşılamadı."); })
      .finally(() => { if (!cancelled) setForecastLoading(false); });
    return () => { cancelled = true; };
  }, [aktifSekme, cafeSlug, forecastMetric]);

  const downloadQR = () => {
    const canvas = document.getElementById("qr-canvas");
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `masa-${seciliMasa}-qr.png`;
    link.click();
  };

  if (!user) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: theme.bgSecondary, fontFamily: theme.fontSans }}>
      <form onSubmit={(e) => {
        e.preventDefault();
        signInWithEmailAndPassword(auth, e.target.email.value, e.target.password.value);
      }} style={{ background: theme.bgPrimary, padding: 32, borderRadius: theme.radiusLg, border: `1px solid ${theme.borderPrimary}`, width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 600, textAlign: "center" }}>Flora Cafe Yönetim</p>
        <input name="email" placeholder="E-posta" style={inputStyle} />
        <input name="password" type="password" placeholder="Şifre" style={inputStyle} />
        <button type="submit" style={btnStylePrimary}>Giriş Yap</button>
      </form>
    </div>
  );

  const bugunBaslangic = new Date();
  bugunBaslangic.setHours(0, 0, 0, 0);
  const bugunBaslangicSaniye = bugunBaslangic.getTime() / 1000;
  const bugunSiparisler = siparisler.filter(s => {
    if (!s.createdAt) return false;
    const siparisSaniyesi = s.createdAt.seconds || new Date(s.createdAt).getTime() / 1000;
    return siparisSaniyesi >= bugunBaslangicSaniye;
  });
  const bugunCiro = bugunSiparisler.reduce((acc, s) => acc + (s.totalPrice || 0), 0);

  return (
    <div style={{ fontFamily: theme.fontSans, maxWidth: 640, margin: "0 auto", paddingBottom: "3rem", background: theme.bgPrimary, minHeight: "100vh" }}>
      <div style={headerStyle}>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: theme.textSecondary }}>Yönetim Paneli</p>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{cafeName || "Yükleniyor..."}</p>
        </div>
        <button onClick={() => signOut(auth)} style={btnStyleSignout}>Çıkış</button>
      </div>

      {/* İstatistik Kartları */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, padding: "20px 24px" }}>
        <div style={statCardStyle}><p style={statLabelStyle}>Ürünler</p><p style={statValueStyle}>{menu.length}</p></div>
        <div style={statCardStyle}><p style={statLabelStyle}>Bugün</p><p style={statValueStyle}>{bugunSiparisler.length}</p></div>
        <div style={statCardStyle}><p style={statLabelStyle}>Ciro</p><p style={statValueStyle}>{bugunCiro} ₺</p></div>
      </div>

      {/* Sekme Menüsü */}
      <div style={{ display: "flex", gap: 0, padding: "0 24px 20px" }}>
        <button onClick={() => setAktifSekme("menu")} style={tabStyle(aktifSekme === "menu", "left")}>Menü</button>
        <button onClick={() => setAktifSekme("qr")} style={tabStyle(aktifSekme === "qr", "none")}>QR</button>
        <button onClick={() => setAktifSekme("siparisler")} style={tabStyle(aktifSekme === "siparisler", "none")}>Siparişler</button>
        <button onClick={() => setAktifSekme("tahmin")} style={tabStyle(aktifSekme === "tahmin", "right")}>Tahmin</button>
      </div>

      <div style={{ padding: "0 24px" }}>
        {aktifSekme === "menu" && (
          <>
            {/* Ürün Ekleme / Düzenleme Formu */}
            <form onSubmit={handleAddItem} style={{...formStyle, border: editingId ? `2px solid #111` : `1px solid ${theme.borderTertiary}`}}>
              <p style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>
                {editingId ? "📝 Ürünü Güncelle" : "➕ Yeni Ürün Ekle"}
              </p>
              
              <p style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", marginBottom: 8, letterSpacing: "0.5px" }}>TÜRKÇE BİLGİLER</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <input placeholder="Ürün adı" value={itemName} onChange={e => setItemName(e.target.value)} style={{ ...inputStyle, gridColumn: "1 / -1" }} />
                <input placeholder="Fiyat ₺" type="number" value={itemPrice} onChange={e => setItemPrice(e.target.value)} style={inputStyle} />
                <input placeholder="Kategori" value={itemCategory} onChange={e => setItemCategory(e.target.value)} style={inputStyle} />
                <input placeholder="Kısa açıklama" value={itemDescription} onChange={e => setItemDescription(e.target.value)} style={{ ...inputStyle, gridColumn: "1 / -1" }} />
              </div>

              <p style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", marginBottom: 8, letterSpacing: "0.5px" }}>ENGLISH DETAILS</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <input placeholder="Product name" value={itemNameEN} onChange={e => setItemNameEN(e.target.value)} style={{ ...inputStyle, gridColumn: "1 / -1" }} />
                <input placeholder="Category (EN)" value={itemCategoryEN} onChange={e => setItemCategoryEN(e.target.value)} style={inputStyle} />
                <input placeholder="Description (EN)" value={itemDescriptionEN} onChange={e => setItemDescriptionEN(e.target.value)} style={inputStyle} />
              </div>

              <input placeholder="Resim URL (https://...)" value={itemImageUrl} onChange={e => setItemImageUrl(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: 12 }} />

              {/* GLUTEN TOGGLE */}
              <div 
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", borderRadius: 10, border: "1px solid #e0e0e0",
                  background: itemGlutensiz ? "#f0fdf4" : "#fff", marginBottom: 14, cursor: "pointer"
                }}
                onClick={() => setItemGlutensiz(!itemGlutensiz)}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111" }}>🌾 Glutensiz Ürün</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Gluten içermez olarak işaretle</p>
                </div>
                <div style={{
                  width: 44, height: 26, borderRadius: 99,
                  background: itemGlutensiz ? "#16a34a" : "#e0e0e0",
                  position: "relative", transition: "background 0.2s"
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", background: "#fff",
                    position: "absolute", top: 3, left: itemGlutensiz ? 21 : 3,
                    transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                  }} />
                </div>
              </div>
              
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={loading} style={{ ...btnStylePrimary, flex: 1 }}>
                  {loading ? "Kaydediliyor..." : editingId ? "Güncellemeyi Kaydet" : "+ Ürünü Menüye Ekle"}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} style={btnStyleSecondary}>İptal</button>
                )}
              </div>
            </form>

            {/* Ürün Listesi */}
            {menu.sort((a,b) => a.category.localeCompare(b.category)).map(item => (
              <div key={item.id} style={itemCardStyle}>
                <div style={itemImageContainer}>
                  {item.imageUrl ? <img src={item.imageUrl} style={itemImageStyle} alt="" /> : "☕"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{item.name}</p>
                    {item.glutensiz && (
                      <span style={{ fontSize: 10, background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", padding: "1px 8px", borderRadius: 99, fontWeight: 800 }}>
                        🌾 GLUTENSİZ
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: theme.textSecondary }}>{item.price} ₺ · {item.category}</p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => startEdit(item)} style={btnStyleSecondary}>Düzenle</button>
                  <button onClick={() => handleDelete(item.id)} style={btnStyleDanger}>Sil</button>
                </div>
              </div>
            ))}
          </>
        )}

        {aktifSekme === "qr" && (
          <div style={qrContainerStyle}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Masa Numarasını Ayarla</label>
              <input type="number" value={seciliMasa} onChange={e => setSeciliMasa(e.target.value)} style={{ ...inputStyle, width: 100, textAlign: "center", fontSize: 18 }} />
            </div>
            <div style={{ background: "#fff", padding: 20, display: "inline-block", borderRadius: 16, border: "1px solid #eee" }}>
              <QRCodeCanvas id="qr-canvas" value={`${BASE_URL}/siparis/${cafeSlug}?masa=${seciliMasa}`} size={200} includeMargin={true} />
              <p style={{ margin: "10px 0 0", fontWeight: 800, fontSize: 20 }}>MASA {seciliMasa}</p>
            </div>
            <br /><br />
            <button onClick={downloadQR} style={{ ...btnStylePrimary, width: "200px" }}>QR Kodu İndir</button>
          </div>
        )}

        {aktifSekme === "siparisler" && (
          <div>
            {bugunSiparisler.length === 0 ? (
              <p style={{ textAlign: "center", color: "#9ca3af", marginTop: 40 }}>Bugün henüz sipariş alınmadı.</p>
            ) : (
              bugunSiparisler.map(order => (
                <div key={order.id} style={itemCardStyle}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 4px", fontWeight: 700 }}>Masa {order.tableNumber}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {order.items?.map((i, idx) => (
                        <span key={idx} style={{ fontSize: 12, background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>
                          {i.name} <b style={{ color: "#000" }}>x{i.qty}</b>
                        </span>
                      ))}
                    </div>
                  </div>
                  <p style={{ fontWeight: 800, fontSize: 16 }}>{order.totalPrice} ₺</p>
                </div>
              ))
            )}
          </div>
        )}

        {aktifSekme === "tahmin" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => setForecastMetric("item_count")}
                style={forecastMetric === "item_count" ? metricBtnActive : metricBtnInactive}
              >
                Ürün Adedi
              </button>
              <button
                onClick={() => setForecastMetric("total_price")}
                style={forecastMetric === "total_price" ? metricBtnActive : metricBtnInactive}
              >
                Ciro (₺)
              </button>
            </div>

            {forecastLoading && (
              <p style={{ textAlign: "center", color: "#9ca3af", marginTop: 40 }}>Tahmin hesaplanıyor...</p>
            )}

            {!forecastLoading && forecastError && (
              <div style={{ background: theme.bgDanger, border: `1px solid ${theme.borderDanger}`, color: theme.textDanger, borderRadius: theme.radiusMd, padding: 14, fontSize: 13 }}>
                {forecastError}
                <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.8 }}>
                  Talep tahmini servisinin (FastAPI) çalıştığından emin ol: <code>uvicorn app.main:app --port 8000</code>
                </p>
              </div>
            )}

            {!forecastLoading && !forecastError && forecastData?.insufficient_data && (
              <div style={{ background: theme.bgSecondary, border: `1px solid ${theme.borderTertiary}`, borderRadius: theme.radiusMd, padding: 14, fontSize: 13, color: theme.textSecondary }}>
                {forecastData.note}
              </div>
            )}

            {!forecastLoading && !forecastError && forecastData && !forecastData.insufficient_data && (
              <>
                <div style={{ background: theme.bgSecondary, borderRadius: theme.radiusMd, padding: 12, marginBottom: 16, fontSize: 12, color: theme.textSecondary }}>
                  {forecastData.note}
                  <div style={{ display: "flex", gap: 16, marginTop: 6, fontWeight: 700, color: theme.textPrimary }}>
                    <span>Baseline MAE: {forecastData.baseline_mae}</span>
                    <span>Prophet MAE: {forecastData.prophet_mae}</span>
                  </div>
                </div>

                {(() => {
                  const maxVal = Math.max(1, ...forecastData.baseline, ...forecastData.prophet);
                  return forecastData.dates.map((date, idx) => {
                    const b = forecastData.baseline[idx];
                    const p = forecastData.prophet[idx];
                    return (
                      <div key={date} style={{ marginBottom: 14 }}>
                        <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700 }}>{date}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, width: 60, color: theme.textSecondary }}>Baseline</span>
                          <div style={{ flex: 1, background: theme.bgSecondary, borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ width: `${(b / maxVal) * 100}%`, background: "#9ca3af", height: 16, borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 11, width: 40, textAlign: "right" }}>{b}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, width: 60, color: theme.textSecondary }}>Prophet</span>
                          <div style={{ flex: 1, background: theme.bgSecondary, borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ width: `${(p / maxVal) * 100}%`, background: theme.brandColor, height: 16, borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 11, width: 40, textAlign: "right" }}>{p}</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Yardımcı Stillere devam... (Aşağısı aynı)
const inputStyle = { padding: "11px 14px", borderRadius: theme.radiusMd, border: `1px solid ${theme.borderPrimary}`, fontSize: 14, outline: "none", boxSizing: "border-box" };
const btnStylePrimary = { padding: "12px 24px", borderRadius: theme.radiusMd, background: theme.brandColor, color: "#ffffff", border: "none", cursor: "pointer", fontWeight: 700, transition: "opacity 0.2s" };
const btnStyleSecondary = { padding: "8px 14px", borderRadius: theme.radiusMd, background: theme.bgSecondary, border: `1px solid ${theme.borderTertiary}`, fontSize: 12, cursor: "pointer", fontWeight: 600 };
const btnStyleDanger = { padding: "8px 14px", borderRadius: theme.radiusMd, background: theme.bgDanger, color: theme.textDanger, border: "none", fontSize: 12, cursor: "pointer", fontWeight: 600 };
const btnStyleSignout = { padding: "6px 12px", borderRadius: theme.radiusMd, background: "#fff", border: `1px solid ${theme.borderPrimary}`, fontSize: 12, cursor: "pointer", fontWeight: 600 };
const headerStyle = { padding: "18px 24px", borderBottom: `1px solid ${theme.borderTertiary}`, display: "flex", justifyContent: "space-between", alignItems: "center", sticky: "top", background: "#fff", zIndex: 10 };
const statCardStyle = { background: theme.bgSecondary, padding: 12, borderRadius: theme.radiusMd, border: `1px solid ${theme.borderTertiary}`, textAlign: "center" };
const statLabelStyle = { margin: "0 0 4px", fontSize: 10, color: theme.textSecondary, fontWeight: 700, textTransform: "uppercase" };
const statValueStyle = { margin: 0, fontSize: 18, fontWeight: 800 };
const formStyle = { background: "#fff", border: `1px solid ${theme.borderTertiary}`, borderRadius: theme.radiusLg, padding: 20, marginBottom: 24, boxShadow: "0 4px 12px rgba(0,0,0,0.03)" };
const itemCardStyle = { background: "#fff", border: `1px solid ${theme.borderTertiary}`, borderRadius: theme.radiusLg, display: "flex", alignItems: "center", gap: 12, padding: "12px", marginBottom: 10 };
const itemImageContainer = { width: 50, height: 50, borderRadius: 10, background: theme.bgSecondary, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid #f0f0f0" };
const itemImageStyle = { width: "100%", height: "100%", objectFit: "cover" };
const qrContainerStyle = { textAlign: "center", paddingTop: 30 };
const metricBtnActive = { padding: "8px 14px", borderRadius: theme.radiusMd, background: theme.brandColor, color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" };
const metricBtnInactive = { ...metricBtnActive, background: theme.bgSecondary, color: theme.textSecondary };
const tabStyle = (active, pos) => ({
  flex: 1, padding: "12px", 
  borderRadius: pos === "left" ? "12px 0 0 12px" : pos === "right" ? "0 12px 12px 0" : "0",
  background: active ? theme.textPrimary : theme.bgSecondary,
  color: active ? "#fff" : theme.textSecondary,
  border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, transition: "all 0.2s"
});