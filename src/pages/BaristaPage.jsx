import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, limit } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { LayoutGrid, History } from "lucide-react";
import { kisaSiparisNo } from "../utils/siparisNo";
import { playBildirimSesi } from "../utils/bildirimSesi";
import BaristaLogin from "../components/barista/BaristaLogin";
import BaristaHeader from "../components/barista/BaristaHeader";
import PanelTabs from "../components/barista/PanelTabs";
import LiveBoard from "../components/barista/LiveBoard";
import useMediaQuery from "../hooks/useMediaQuery";

// Sipariş durum akışı: pending → preparing → ready → completed.
// "ready" = hazır, teslim bekliyor (müşteriye "siparişin hazır" bildirimi
// bu anda gidiyor); "completed" = teslim edildi. "odendi" eski "Hesap İste"
// akışından kalan, artık oluşmayan bir durum — sadece geçmişte görünüyor.
const AKTIF_DURUMLAR = ["pending", "preparing", "ready"];

const SES_TERCIHI_ANAHTARI = "barista_ses";

function sesTercihiOku() {
  try {
    return localStorage.getItem(SES_TERCIHI_ANAHTARI) !== "kapali";
  } catch {
    return true;
  }
}

function saatMetni() {
  return new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function PanelYukleniyor() {
  return (
    <main className="flora-panel" role="status" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <div style={{ display: "flex", gap: 6 }} aria-hidden="true">
        <span className="flora-dot" /><span className="flora-dot" /><span className="flora-dot" />
      </div>
      <p style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--color-text-muted)" }}>Yükleniyor…</p>
    </main>
  );
}

export default function BaristaPage() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [orders, setOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("aktif");
  const genisEkran = useMediaQuery("(min-width: 1024px)");

  // Canlı bağlantı göstergesi: Firestore anlık görüntüsü önbellekten
  // geliyorsa (sunucuya ulaşılamıyorsa) ya da tarayıcı çevrimdışıysa "koptu".
  const [sunucudan, setSunucudan] = useState(true);
  const [cevrimici, setCevrimici] = useState(navigator.onLine);
  const [saat, setSaat] = useState(saatMetni);

  // Yeni sipariş sesi: tercih cihazda saklanıyor. Dinleyici yeniden
  // kurulmasın diye güncel değer ref üzerinden okunuyor.
  const [sesAcik, setSesAcik] = useState(sesTercihiOku);
  const sesAcikRef = useRef(sesAcik);
  const gorulenYeniSiparisler = useRef(null);

  // Sabit Cafe ID
  const CAFE_ID = "qCW9g5eYB4ycmkIHCHSZ";

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setSaat(saatMetni()), 15000);
    const cevrimiciOl = () => setCevrimici(true);
    const cevrimdisiOl = () => setCevrimici(false);
    window.addEventListener("online", cevrimiciOl);
    window.addEventListener("offline", cevrimdisiOl);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", cevrimiciOl);
      window.removeEventListener("offline", cevrimdisiOl);
    };
  }, []);

  const sesDegistir = () => {
    const yeni = !sesAcik;
    setSesAcik(yeni);
    sesAcikRef.current = yeni;
    try {
      localStorage.setItem(SES_TERCIHI_ANAHTARI, yeni ? "acik" : "kapali");
    } catch {
      // tercih saklanamadı; bu oturum için yine de geçerli
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, e.target.email.value, e.target.password.value);
    } catch {
      setLoginError("E-posta veya şifre hatalı.");
    }
  };

  useEffect(() => {
    if (!user) return;
    const ordersRef = collection(db, "cafes", CAFE_ID, "orders");

    // Aktif siparişler — metadata değişiklikleri de dinleniyor ki bağlantı
    // koptuğunda/geri geldiğinde gösterge güncellensin.
    const activeQuery = query(ordersRef, orderBy("createdAt", "desc"));
    const unsubscribeActive = onSnapshot(activeQuery, { includeMetadataChanges: true }, (snapshot) => {
      setSunucudan(!snapshot.metadata.fromCache);
      const aktifler = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => AKTIF_DURUMLAR.includes(s.status));
      setOrders(aktifler);

      // İlk yüklemeden sonra gelen yeni "pending" siparişler için ses
      const yeniIdler = aktifler.filter(s => s.status === "pending").map(s => s.id);
      if (gorulenYeniSiparisler.current === null) {
        gorulenYeniSiparisler.current = new Set(yeniIdler);
      } else {
        const gercektenYeni = yeniIdler.filter(id => !gorulenYeniSiparisler.current.has(id));
        yeniIdler.forEach(id => gorulenYeniSiparisler.current.add(id));
        if (gercektenYeni.length > 0 && sesAcikRef.current) playBildirimSesi();
      }
    });

    // Tamamlanan Siparişler Dinleyicisi (Son 30)
    const completedQuery = query(ordersRef, orderBy("createdAt", "desc"), limit(30));
    const unsubscribeCompleted = onSnapshot(completedQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCompletedOrders(ordersData.filter(o => o.status === "completed" || o.status === "odendi"));
      setLoading(false);
    });

    return () => {
      unsubscribeActive();
      unsubscribeCompleted();
      gorulenYeniSiparisler.current = null;
    };
  }, [user]);

  const updateOrderStatus = async (orderId, newStatus, extraFields = {}) => {
    try {
      await updateDoc(doc(db, "cafes", CAFE_ID, "orders", orderId), { status: newStatus, ...extraFields });
    } catch (err) {
      console.error("Hata:", err);
    }
  };

  const deleteOrder = async (orderId) => {
    if (window.confirm("Bu kaydı kalıcı olarak silmek istediğine emin misin?")) {
      try {
        await deleteDoc(doc(db, "cafes", CAFE_ID, "orders", orderId));
      } catch (err) {
        console.error("Silme hatası:", err);
      }
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Az önce";
    const diffInMins = Math.floor((new Date() - timestamp.toDate()) / 60000);
    return diffInMins < 1 ? "Az önce" : `${diffInMins} dk önce`;
  };

  if (!authChecked) return <PanelYukleniyor />;

  if (!user) return <BaristaLogin onSubmit={handleLogin} hata={loginError} />;

  if (loading) return <PanelYukleniyor />;

  const sayilar = {
    yeni: orders.filter(o => o.status === "pending").length,
    hazirlaniyor: orders.filter(o => o.status === "preparing").length,
    hazir: orders.filter(o => o.status === "ready").length,
  };
  const tahsilEdilecek = orders
    .filter(o => o.paymentStatus === "beklemede")
    .reduce((toplam, o) => toplam + (o.totalPrice || 0), 0);

  return (
    <main className="flora-panel" style={{
      display: "flex", flexDirection: "column", gap: 20,
      // Geniş ekranda canlı pano ekranı tam kaplıyor; kaydırma sütunların içinde
      ...(genisEkran && activeTab === "aktif" ? { height: "100dvh", overflow: "hidden" } : {})
    }}>
      <BaristaHeader
        bagli={sunucudan && cevrimici}
        saat={saat}
        sayilar={sayilar}
        tahsilEdilecek={tahsilEdilecek}
        sesAcik={sesAcik}
        onSesDegistir={sesDegistir}
        onCikis={() => signOut(auth)}
      />

      <div>
        <PanelTabs
          aktif={activeTab}
          onSec={setActiveTab}
          sekmeler={[
            { key: "aktif", etiket: "Canlı takip", Icon: LayoutGrid, rozet: orders.length },
            { key: "tamamlanan", etiket: "Geçmiş", Icon: History },
          ]}
        />
      </div>

      {/* CANLI PANO */}
      {activeTab === "aktif" && (
        <LiveBoard
          orders={orders}
          kartCiz={(order) => (
            <SiparisKarti
              key={order.id}
              order={order}
              updateOrderStatus={updateOrderStatus}
              deleteOrder={deleteOrder}
              getTimeAgo={getTimeAgo}
              isCompleted={false}
            />
          )}
        />
      )}

      {/* GEÇMİŞ — 4. adımda yeni tablo görünümüyle değişecek */}
      {activeTab === "tamamlanan" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640 }}>
          {completedOrders.map(order => (
            <SiparisKarti
              key={order.id}
              order={order}
              updateOrderStatus={updateOrderStatus}
              deleteOrder={deleteOrder}
              getTimeAgo={getTimeAgo}
              isCompleted
            />
          ))}
          {completedOrders.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>Henüz hareket yok...</div>
          )}
        </div>
      )}
    </main>
  );
}

function SiparisKarti({ order, updateOrderStatus, getTimeAgo, isCompleted, deleteOrder }) {
  const isPreparing = order.status === "preparing";
  const nakitBekliyor = order.paymentStatus === "beklemede";
  const [nakitOnaylandi, setNakitOnaylandi] = useState(false);

  const teslimEt = () => {
    if (nakitBekliyor) {
      updateOrderStatus(order.id, "completed", { paymentStatus: "odendi" });
    } else {
      updateOrderStatus(order.id, "completed");
    }
  };

  return (
    <div style={{
      borderRadius: 22, border: "1px solid",
      borderColor: isCompleted ? "#f3f4f6" : (isPreparing ? "#bfdbfe" : "#fde68a"),
      background: isCompleted ? "#fafafa" : (isPreparing ? "#eff6ff" : "#fffbeb"),
      padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Masa {order.tableNumber}</h3>
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            <span style={{ fontWeight: 700, color: "#374151", fontVariantNumeric: "tabular-nums" }}>#{kisaSiparisNo(order.id)}</span>
            {" · "}{getTimeAgo(order.createdAt)}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          {isCompleted ? (
            <button onClick={() => deleteOrder(order.id)} style={{ border: "none", background: "none", color: "#ef4444", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>🗑️ Sil</button>
          ) : (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8,
              background: isPreparing ? "#dbeafe" : "#fef3c7", color: isPreparing ? "#1d4ed8" : "#b45309"
            }}>
              {isPreparing ? "HAZIRLANIYOR" : "YENİ SİPARİŞ"}
            </span>
          )}
          {order.paymentMethod && (
            nakitBekliyor ? (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: "#ffedd5", color: "#c2410c" }}>
                💵 Nakit — Teslimde Tahsil Et
              </span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: "#dcfce7", color: "#15803d" }}>
                ✓ Ödendi
              </span>
            )
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        {order.items?.map((item, idx) => (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: 16, color: "#111" }}>{item.name}</span>
            <span style={{ fontWeight: 800, fontSize: 14, background: "rgba(0,0,0,0.05)", padding: "4px 10px", borderRadius: 8 }}>x{item.qty}</span>
          </div>
        ))}
      </div>

      {order.not && (
        <div style={{ padding: "10px 12px", background: "#fff", borderRadius: 12, border: "1px solid #fde68a", marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#92400e", fontWeight: 500 }}>📝 {order.not}</p>
        </div>
      )}

      {!isCompleted && isPreparing && nakitBekliyor && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#ffedd5", borderRadius: 12, marginBottom: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={nakitOnaylandi} onChange={e => setNakitOnaylandi(e.target.checked)} style={{ width: 16, height: 16 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#c2410c" }}>Nakit Ödemesi Alındı</span>
        </label>
      )}

      {!isCompleted && (
        <button
          onClick={() => isPreparing ? teslimEt() : updateOrderStatus(order.id, "preparing")}
          disabled={isPreparing && nakitBekliyor && !nakitOnaylandi}
          style={{
            width: "100%", padding: "16px", borderRadius: 16, border: "none", fontSize: 15, fontWeight: 700,
            cursor: (isPreparing && nakitBekliyor && !nakitOnaylandi) ? "not-allowed" : "pointer",
            background: (isPreparing && nakitBekliyor && !nakitOnaylandi) ? "#d1d5db" : (isPreparing ? "#10b981" : "#111"),
            color: "#fff"
          }}
        >
          {isPreparing ? "✓ Hazır, Bildir" : "Hazırlamaya Başla"}
        </button>
      )}
    </div>
  );
}
