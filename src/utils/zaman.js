// Firestore Timestamp, Date ya da (eski kayıtlarda görülen) ISO metni → Date.
export function tariheCevir(deger) {
  if (!deger) return null;
  if (typeof deger.toDate === "function") return deger.toDate();
  const tarih = deger instanceof Date ? deger : new Date(deger);
  return Number.isNaN(tarih.getTime()) ? null : tarih;
}

const AYLAR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function gunBaslangici(tarih) {
  return new Date(tarih.getFullYear(), tarih.getMonth(), tarih.getDate());
}

// "Bugün 09:42", "Dün 18:10", "6 Eki 18:10" (başka yılsa "6 Eki 2025 18:10").
export function gecmisZamanMetni(deger, simdi = new Date()) {
  const tarih = tariheCevir(deger);
  if (!tarih) return "—";
  const saat = tarih.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const gunFarki = Math.round((gunBaslangici(simdi) - gunBaslangici(tarih)) / 86400000);
  if (gunFarki === 0) return `Bugün ${saat}`;
  if (gunFarki === 1) return `Dün ${saat}`;
  const yil = tarih.getFullYear() === simdi.getFullYear() ? "" : ` ${tarih.getFullYear()}`;
  return `${tarih.getDate()} ${AYLAR[tarih.getMonth()]}${yil} ${saat}`;
}

// Bugünden geriye `gun` takvim günü (bugün dahil) başlangıcı
export function gunlerOncesi(gun, simdi = new Date()) {
  const baslangic = gunBaslangici(simdi);
  baslangic.setDate(baslangic.getDate() - (gun - 1));
  return baslangic;
}
