# Flora Cafe — Kafe Sipariş & Yönetim Sistemi

Masa başı kendi kendine sipariş verilebilen, 3 panelli bir kafe sipariş
sistemi (React 18 + Vite + Firebase/Firestore PWA), üzerine eklenmiş AI
destekli talep tahmini, ürün önerisi ve RAG destek asistanı özellikleriyle.

Bu proje bir üniversite bitirme projesi (kapstone) olarak, IEEE 830 SRS
metodolojisiyle belgelenmek üzere geliştirilmektedir.

## Mimari

İki ayrı, bağımsız çalışan parça var:

1. **Ana uygulama** (bu dizin) — React/Vite frontend + Firebase (Firestore,
   Auth, Storage, Messaging). Üç panel:
   - `/siparis/:cafeSlug` — **Müşteri**: menüyü görür, sepete ekler, sipariş
     verir, hesap ister; ürün önerisi ve menü asistanı sohbeti burada.
   - `/panel/barista` — **Barista**: gelen siparişleri görür, durumlarını
     günceller (giriş gerektirir, tek kafeye sabitli — bkz. Bilinen Sınırlar).
   - `/panel/owner` — **Kafe Sahibi**: menü yönetimi, QR kod üretimi,
     sipariş geçmişi, talep tahmini sekmesi (giriş gerektirir, slug bazlı
     çok-kiracılı).
2. **`service/`** — ayrı bir Python/FastAPI mikroservisi, Firebase Admin
   SDK ile Firestore'u okuyup üç AI özelliğini sunuyor: talep tahmini,
   ürün önerisi, RAG destek asistanı. Neden ayrı bir servis ve teknik
   detaylar için bkz. [`service/README.md`](service/README.md).

Bu ayrım bilinçli bir mimari karar: veri bilimi/AI iş yükü (pandas,
Prophet, LLM çağrıları) Node.js Cloud Functions'a sıkıştırılmak yerine
Python'un bu alandaki doğal ekosisteminde, ayrı ve bağımsız ölçeklenebilir
bir servis olarak tutuluyor.

## Özellikler (faz faz geliştirme sırası)

- **Faz 0 — Altyapı sağlamlaştırma**: barista giriş koruması, çevrimdışı
  sipariş kuyruğu (`src/utils/offlineQueue.js`, bağlantı kesildiğinde
  sipariş biriktirip geri bağlanınca gönderir), PWA manifest, deploy
  edilmiş `firestore.rules`.
- **Faz 1 — Talep tahmini**: owner panelinde "Tahmin" sekmesi; basit bir
  baseline (haftanın günü ortalaması) ile Prophet'i MAE/RMSE üzerinden
  karşılaştırır. Prophet "tek doğru model" olarak sunulmaz — bu ölçekte
  (kısa gerçek sipariş geçmişi) iki modelin karşılaştırılması akademik
  olarak daha dürüst bir sunum.
- **Faz 2 — Ürün önerisi**: müşteri sepetine göre, geçmiş sipariş
  sepetlerinden kurulan ürün-ürün co-occurrence (birlikte-alınma) matrisine
  dayalı öneri ("Bunu da beğenebilirsin"). Müşteri hesabı olmadığı için
  klasik kullanıcı bazlı collaborative filtering yerine bu yaklaşım
  seçildi; veri yoksa kategori benzerliğine düşer.
- **Faz 3 — RAG destek asistanı**: müşteri panelinde sohbet asistanı,
  SADECE Firestore'daki menü verisinden cevap üretir (yerel Ollama modeli,
  llama3.1:8b), alerjen/besin gibi belirsiz konularda tahmin etmeyip
  "elimde yok, personele sor" der. Modelin kendi bildirdiği groundedness
  (dayanaklılık) bayrağının güvenilirliği, elle etiketlenmiş TR/EN bir
  değerlendirme setiyle ölçülüyor (bkz. `service/eval/`) — projenin asıl
  bilimsel katkısı.

Detaylı endpoint listesi, kurulum ve değerlendirme metodolojisi için
[`service/README.md`](service/README.md)'ye bakın.

## Bilinen sınırlar (SRS'te "limitations" olarak belgelenmeli)

- `BaristaPage` tek bir kafeye (`CAFE_ID`) sabitlenmiş durumda — `OwnerPage`
  ve `CustomerPage` slug bazlı çok-kiracılı çalışırken barista girişi
  henüz değil.
- Müşteri tarafında kalıcı bir kimlik yok (anonim, sadece masa numarasıyla
  ayrışıyor) — bu kasıtlı bir tasarım kararı (bkz. Faz 2 gerekçesi).
- RAG asistanı, küçük yerel bir modelle (8B parametre) çalıştığı için
  bazen benzer isimli ürünleri karıştırabiliyor veya sohbet/selamlaşma
  mesajlarını %100 tutarlı ele alamıyor — bu model ölçeğine bağlı bir
  sınırlama, prompt mühendisliğiyle tamamen ortadan kaldırılabilir değil.
- Push bildirimleri (`functions/index.js`'teki `notifyBarista`) uçtan uca
  bağlanmadı — bir Firebase Cloud Messaging VAPID key üretimi gerekiyor,
  şimdilik önceliksiz olarak ertelendi.

## Kurulum ve çalıştırma (ana uygulama)

```bash
npm install
npm run dev       # geliştirme sunucusu
npm run build     # production build
npm run lint      # ESLint
```

Firebase yapılandırması `src/firebase.js` içinde. Firestore güvenlik
kuralları için: `firebase deploy --only firestore:rules`.

AI servisini de çalıştırmak için (talep tahmini/öneri/asistan
özelliklerinin frontend'de çalışması için gerekli) bkz.
[`service/README.md`](service/README.md).

## Teknoloji yığını

- Frontend: React 18, Vite, react-router-dom, Firebase SDK (Firestore,
  Auth, Storage, Messaging), qrcode.react
- Backend (ana): Firebase (Firestore, Auth, Cloud Functions, Firestore
  Security Rules)
- AI servisi: Python, FastAPI, pandas, Prophet, Ollama (yerel LLM),
  firebase-admin
