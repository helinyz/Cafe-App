import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { LayoutGrid, History } from "lucide-react";
import { playBildirimSesi } from "../utils/bildirimSesi";
import BaristaLogin from "../components/barista/BaristaLogin";
import BaristaHeader from "../components/barista/BaristaHeader";
import PanelTabs from "../components/barista/PanelTabs";
import LiveBoard from "../components/barista/LiveBoard";
import OrderCard from "../components/barista/OrderCard";
import HistoryView from "../components/barista/HistoryView";
import { gunlerOncesi } from "../utils/zaman";
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

    // Geçmiş: son 7 takvim gününün tamamlanmış siparişleri ("Son 7 gün"
    // filtresinin doğru olması için eski "son 30 kayıt" sınırı yerine tarih aralığı).
    // Sayfa gün boyu açık kalırsa aralık, dinleyici yeniden kurulana kadar
    // açılış anına göre kalıyor — "Bugün" filtresi istemci tarafında hesaplandığı
    // için doğru kalmaya devam ediyor.
    const completedQuery = query(
      ordersRef,
      where("createdAt", ">=", Timestamp.fromDate(gunlerOncesi(7))),
      orderBy("createdAt", "desc")
    );
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

  // Başarılıysa true döner; kart hata durumunu kullanıcıya gösterebilsin diye.
  const updateOrderStatus = async (orderId, newStatus, extraFields = {}) => {
    try {
      await updateDoc(doc(db, "cafes", CAFE_ID, "orders", orderId), { status: newStatus, ...extraFields });
      return true;
    } catch (err) {
      console.error("Hata:", err);
      return false;
    }
  };

  // Onay satır içinde (HistoryRow) soruluyor; başarılıysa true döner.
  const deleteOrder = async (orderId) => {
    try {
      await deleteDoc(doc(db, "cafes", CAFE_ID, "orders", orderId));
      return true;
    } catch (err) {
      console.error("Silme hatası:", err);
      return false;
    }
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
            // key'e durum da ekli: sütun değiştiren kart yeniden oluşup
            // kısa giriş animasyonunu oynatıyor, işlem durumu sıfırlanıyor
            <OrderCard key={`${order.id}-${order.status}`} order={order} onDurumGuncelle={updateOrderStatus} />
          )}
        />
      )}

      {/* GEÇMİŞ */}
      {activeTab === "tamamlanan" && <HistoryView siparisler={completedOrders} onSil={deleteOrder} />}
    </main>
  );
}
