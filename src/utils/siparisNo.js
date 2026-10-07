// Ayrı bir sipariş numarası sayacı yok; müşteri onay ekranında ve barista
// kartında aynı kısa numara gösteriliyor: Firestore belge id'sinin son 4
// karakteri. İki taraf da bu fonksiyonu kullanmalı ki numaralar eşleşsin.
export function kisaSiparisNo(siparisId) {
  return siparisId ? siparisId.slice(-4).toUpperCase() : null;
}
