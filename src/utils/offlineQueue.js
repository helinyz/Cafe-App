const KUYRUK_KEY = "bekleyen_siparisler";

// Siparişi tarayıcının hafızasına (kuyruğa) ekle ✨
export const kuyruğaEkle = (siparis) => {
  const mevcut = JSON.parse(localStorage.getItem(KUYRUK_KEY) || "[]");
  mevcut.push({ ...siparis, zaman: Date.now() });
  localStorage.setItem(KUYRUK_KEY, JSON.stringify(mevcut));
};

// İnternet geri geldiğinde kuyruktaki siparişleri Firebase'e gönder ✨
export const kuyruğuBoşalt = async (cafeId, db, addDoc, collection) => {
  const bekleyenler = JSON.parse(localStorage.getItem(KUYRUK_KEY) || "[]");
  if (bekleyenler.length === 0) return;

  try {
    for (const siparis of bekleyenler) {
      // Firebase'e yazarken zaman damgasını yeniliyoruz
      await addDoc(collection(db, "cafes", cafeId, "orders"), {
        ...siparis,
        createdAt: new Date()
      });
    }
    // Başarıyla gönderildikten sonra hafızayı temizle
    localStorage.removeItem(KUYRUK_KEY);
    console.log("Kuyruktaki siparişler başarıyla gönderildi! 🎉");
  } catch (error) {
    console.error("Kuyruk boşaltılırken hata oluştu:", error);
  }
};