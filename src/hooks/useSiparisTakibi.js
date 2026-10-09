import { useCallback, useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { playBildirimSesi } from "../utils/bildirimSesi";

// Müşterinin verdiği siparişlerin canlı takibi.
//
// Takip edilen sipariş id'leri cihazda (localStorage) saklanıyor: sayfa
// yenilense, link yeniden açılsa ya da telefon arka plandaki sekmeyi yeniden
// yüklese bile "siparişin hazır" bildirimi kaybolmuyor. Önceden id yalnızca
// bellekteydi ve bu durumların hepsinde bildirim hiç gelmiyordu.
//
// Teslim edilen (completed) ya da silinen sipariş takipten çıkıyor; unutulmuş
// kayıtlar 12 saat sonra kendiliğinden düşüyor.

const TAKIP_SURESI_MS = 12 * 60 * 60 * 1000;
const BITMIS_DURUMLAR = ["completed", "odendi"];

function takipleriOku(anahtar) {
  try {
    const liste = JSON.parse(localStorage.getItem(anahtar) || "[]");
    if (!Array.isArray(liste)) return [];
    return liste.filter(x => x && typeof x.id === "string" && Date.now() - x.zaman < TAKIP_SURESI_MS);
  } catch {
    return [];
  }
}

function takipleriYaz(anahtar, liste) {
  try {
    localStorage.setItem(anahtar, JSON.stringify(liste));
  } catch {
    // saklanamadı (gizli sekme vb.); bu oturumda bellekten takip sürüyor
  }
}

// Hazır uyarısı: ses + (destekleyen telefonlarda) titreşim
function hazirUyarisi() {
  playBildirimSesi();
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // titreşim desteklenmiyor
  }
}

export default function useSiparisTakibi(cafeId, cafeSlug, hazirBasligi) {
  const anahtar = `flora_siparis_takip_${cafeSlug}`;
  const [takipler, setTakipler] = useState(() => takipleriOku(anahtar)); // [{ id, zaman }]
  const [durumlar, setDurumlar] = useState({}); // id -> status
  const [kapatilanlar, setKapatilanlar] = useState([]); // "hazır" bandı kapatılan id'ler
  const oncekiDurumlar = useRef({});

  useEffect(() => {
    takipleriYaz(anahtar, takipler);
  }, [anahtar, takipler]);

  const takipEkle = useCallback((id) => {
    setTakipler(liste => (liste.some(x => x.id === id) ? liste : [...liste, { id, zaman: Date.now() }]));
  }, []);

  const bildirimKapat = useCallback((id) => {
    setKapatilanlar(liste => (liste.includes(id) ? liste : [...liste, id]));
  }, []);

  const idAnahtari = takipler.map(x => x.id).join(",");

  useEffect(() => {
    if (!cafeId || !idAnahtari) return;
    const aboneler = idAnahtari.split(",").map(id =>
      onSnapshot(
        doc(db, "cafes", cafeId, "orders", id),
        (snap) => {
          const durum = snap.exists() ? snap.data().status : null;
          const onceki = oncekiDurumlar.current[id];
          oncekiDurumlar.current[id] = durum;

          if (!durum || BITMIS_DURUMLAR.includes(durum)) {
            setTakipler(liste => liste.filter(x => x.id !== id));
            setDurumlar(d => {
              const yeni = { ...d };
              delete yeni[id];
              return yeni;
            });
            return;
          }

          setDurumlar(d => ({ ...d, [id]: durum }));
          // Hazır'a geçişte (ya da sayfa açıldığında zaten hazırsa) bir kez uyar.
          // Barista "Geri al" yaparsa durum "preparing"e döner ve bant kendiliğinden kalkar.
          if (durum === "ready" && onceki !== "ready") {
            setKapatilanlar(liste => liste.filter(x => x !== id));
            hazirUyarisi();
          }
        },
        () => {
          // okuma hatası (ağ vb.) — dinleyici Firestore tarafından yeniden deneniyor
        }
      )
    );
    return () => aboneler.forEach(abonelikIptal => abonelikIptal());
  }, [cafeId, idAnahtari]);

  const aktifSiparisler = takipler
    .filter(x => durumlar[x.id])
    .map(x => ({ id: x.id, durum: durumlar[x.id] }));
  const hazirIdler = aktifSiparisler
    .filter(s => s.durum === "ready" && !kapatilanlar.includes(s.id))
    .map(s => s.id);

  // Sekme arka plandayken de fark edilsin: hazır sipariş varken sekme başlığı değişiyor
  const hazirVar = hazirIdler.length > 0;
  useEffect(() => {
    if (!hazirVar) return;
    const eskiBaslik = document.title;
    document.title = hazirBasligi;
    return () => {
      document.title = eskiBaslik;
    };
  }, [hazirVar, hazirBasligi]);

  return { aktifSiparisler, hazirIdler, takipEkle, bildirimKapat };
}
