# Flora Cafe – Talep Tahmini Servisi (Faz 1)

Owner panelindeki talep tahmini sekmesine veri sağlayan ayrı bir FastAPI
mikroservisi. Ana React/Firebase uygulamasından bağımsız çalışır ve
Firestore'daki sipariş geçmişini okumak için Firebase Admin SDK kullanır.

## Neden ayrı bir servis?
Talep tahmini (Prophet + baseline karşılaştırması) Node.js Cloud Functions'a
göre Python'un veri bilimi ekosisteminde (pandas, Prophet) çok daha doğal.
Bu yüzden Cloud Functions'a sıkıştırılmadı; ayrı bir Python/FastAPI servisi
olarak tasarlandı (bkz. proje planı).

## Kurulum

```bash
cd service
python3 -m venv .venv   # zaten varsa atla
source .venv/bin/activate
pip install -r requirements.txt

# Prophet'in gömülü cmdstan kopyası bozuk (bkz. scripts/fix_prophet_cmdstan.py),
# sistemde tam bir cmdstan kurulumu gerekiyor:
install_cmdstan
python scripts/fix_prophet_cmdstan.py
```

Firebase Admin SDK için bir servis hesabı anahtarı gerekiyor:

1. Firebase Console → Project Settings → Service Accounts → "Generate new private key"
2. İndirilen JSON dosyasını `service/serviceAccountKey.json` olarak kaydet (bu dosya `.gitignore`'da, commit'lenmez)
3. `.env.example`'ı `.env` olarak kopyala, gerekirse yollarını düzenle

```bash
cp .env.example .env
```

## Çalıştırma

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

## Endpoint'ler

- `GET /health` — servis ayakta mı
- `GET /forecast/{cafe_slug}?metric=item_count&horizon_days=7`
  - `metric`: `item_count` (satılan ürün adedi) veya `total_price` (ciro)
  - Dönen veri: gelecek `horizon_days` gün için hem **baseline** (haftanın
    günü ortalaması) hem de **Prophet** tahminini, ve geçmiş verinin son
    bölümünde (`test_days`) iki modelin MAE/RMSE karşılaştırmasını içerir.
  - `history_days < 14` ise (`MIN_HISTORY_DAYS`, bkz. `app/forecasting.py`)
    `insufficient_data: true` döner — Prophet'in haftalık mevsimsellik
    varsayımı bu kadar kısa geçmişte güvenilir değildir, bu akademik olarak
    dürüst bir sınır.

## Tasarım notu (SRS/tez için)
Bu servis Prophet'i "tek doğru model" olarak sunmaz; day-of-week/hour-of-day
ortalamasına dayanan basit bir baseline'a karşı **ablation** olarak sunar.
Gerekçe: bu projede uzun (aylar/yıllar) süren gerçek sipariş geçmişi
olmayacak, Prophet'in asıl gücü uzun mevsimsellik geçmişinde ortaya çıkar.
Kısa geçmişte iki modelin karşılaştırılması, hangisinin bu ölçekte daha
uygun olduğunu göstermesi bakımından daha dürüst bir sunum.
