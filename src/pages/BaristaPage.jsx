import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, limit } from "firebase/firestore";

export default function BaristaPage() {
  const [orders, setOrders] = useState([]);
  const [hesapIstekleri, setHesapIstekleri] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("aktif");

  // Sabit Cafe ID
  const CAFE_ID = "qCW9g5eYB4ycmkIHCHSZ";

  useEffect(() => {
    const ordersRef = collection(db, "cafes", CAFE_ID, "orders");
    
    // Aktif ve Hesap İstekleri Dinleyicisi
    const activeQuery = query(ordersRef, orderBy("createdAt", "asc"));
    const unsubscribeActive = onSnapshot(activeQuery, (snapshot) => {
      const tumVeriler = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 1. Hesap İsteklerini Filtrele
      setHesapIstekleri(tumVeriler.filter(s => s.status === "hesap"));

      // 2. Hazırlanan veya Bekleyen Siparişleri Filtrele
      setOrders(tumVeriler.filter(s => s.status === "pending" || s.status === "preparing"));
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
    };
  }, []);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, "cafes", CAFE_ID, "orders", orderId), { status: newStatus });
    } catch (err) {
      console.error("Hata:", err);
    }
  };

  const hesabiKapat = async (orderId) => {
    try {
      await updateDoc(doc(db, "cafes", CAFE_ID, "orders", orderId), { status: "odendi" });
    } catch (err) {
      console.error("Hesap kapatma hatası:", err);
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

  if (loading) return <div style={{ textAlign: "center", marginTop: 50, fontWeight: 700 }}>Yükleniyor...</div>;

  return (
    <div style={{ fontFamily: "-apple-system, sans-serif", maxWidth: 600, margin: "0 auto", padding: "20px 16px 100px" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", fontWeight: 700 }}>FLORA CAFE</p>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Barista Paneli</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
           <Badge color="#6d28d9" bg="#f5f3ff" count={hesapIstekleri.length} label="Hesap" />
           <Badge color="#b45309" bg="#fef3c7" count={orders.length} label="Mutfak" />
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "#f3f4f6", padding: 6, borderRadius: 16, marginBottom: 24 }}>
        <TabButton active={activeTab === "aktif"} onClick={() => setActiveTab("aktif")}>Canlı Takip</TabButton>
        <TabButton active={activeTab === "tamamlanan"} onClick={() => setActiveTab("tamamlanan")}>Geçmiş</TabButton>
      </div>

      {/* İÇERİK ALANI */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        
        {/* 1. HESAP İSTEKLERİ (Sadece Aktif Tabındaysa ve istek varsa göster) */}
        {activeTab === "aktif" && hesapIstekleri.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#6d28d9", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
               <span>🔔</span> Hesap İsteyen Masalar
            </h3>
            {hesapIstekleri.map(istek => (
              <div key={istek.id} style={{
                borderRadius: 20, border: "2px solid #8b5cf6", background: "#fff", 
                marginBottom: 12, overflow: "hidden", boxShadow: "0 4px 12px rgba(109, 40, 217, 0.1)"
              }}>
                <div style={{ background: "#f5f3ff", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#6d28d9" }}>Masa {istek.tableNumber}</span>
                  <span style={{ fontWeight: 800, color: "#4c1d95", background: "#ddd6fe", padding: "4px 10px", borderRadius: 10, fontSize: 12 }}>
                    {istek.odemeYontemi === "nakit" ? "💵 NAKİT" : "💳 KART"}
                  </span>
                </div>
                <div style={{ padding: 12 }}>
                  <button onClick={() => hesabiKapat(istek.id)} style={{ width: "100%", padding: 14, borderRadius: 12, background: "#8b5cf6", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}>
                    Ödeme Alındı - Masayı Kapat
                  </button>
                </div>
              </div>
            ))}
            <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "20px 0" }} />
          </div>
        )}

        {/* 2. NORMAL SİPARİŞLER */}
        {(activeTab === "aktif" ? orders : completedOrders).map(order => (
          <SiparisKarti 
            key={order.id} 
            order={order} 
            updateOrderStatus={updateOrderStatus} 
            deleteOrder={deleteOrder} 
            getTimeAgo={getTimeAgo}
            isCompleted={activeTab === "tamamlanan" || order.status === "odendi"}
          />
        ))}

        {(activeTab === "aktif" ? (orders.length + hesapIstekleri.length) : completedOrders.length) === 0 && (
          <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>Henüz hareket yok...</div>
        )}
      </div>
    </div>
  );
}

function SiparisKarti({ order, updateOrderStatus, getTimeAgo, isCompleted, deleteOrder }) {
  const isPreparing = order.status === "preparing";

  return (
    <div style={{
      borderRadius: 22, border: "1px solid",
      borderColor: isCompleted ? "#f3f4f6" : (isPreparing ? "#bfdbfe" : "#fde68a"),
      background: isCompleted ? "#fafafa" : (isPreparing ? "#eff6ff" : "#fffbeb"),
      padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Masa {order.tableNumber}</h3>
          <span style={{ fontSize: 12, color: "#6b7280" }}>{getTimeAgo(order.createdAt)}</span>
        </div>
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

      {!isCompleted && (
        <button
          onClick={() => updateOrderStatus(order.id, isPreparing ? "completed" : "preparing")}
          style={{
            width: "100%", padding: "16px", borderRadius: 16, border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer",
            background: isPreparing ? "#10b981" : "#111", color: "#fff"
          }}
        >
          {isPreparing ? "✓ Hazır, Bildir" : "Hazırlamaya Başla"}
        </button>
      )}
    </div>
  );
}

const Badge = ({ label, count, color, bg }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
    <span style={{ fontSize: 9, fontWeight: 800, color: "#9ca3af" }}>{label}</span>
    <div style={{ background: bg, color: color, padding: "4px 10px", borderRadius: 10, fontSize: 12, fontWeight: 700 }}>{count}</div>
  </div>
);

const TabButton = ({ active, children, onClick }) => (
  <button onClick={onClick} style={{
    padding: "10px", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
    background: active ? "#fff" : "transparent", color: active ? "#111" : "#6b7280",
    transition: "all 0.2s"
  }}>{children}</button>
);