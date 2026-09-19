# Flora Cafe – AI Servisleri (Faz 1-3)

Owner ve customer panellerine AI özellikleri sağlayan ayrı bir FastAPI
mikroservisi: talep tahmini, ürün önerisi ve RAG destek asistanı. Ana
React/Firebase uygulamasından bağımsız çalışır ve Firestore verisini
okumak için Firebase Admin SDK kullanır.

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

RAG asistanı (Faz 3) için [Ollama](https://ollama.com) kurulu ve çalışır
olmalı, ve kullanılacak model çekilmiş olmalı:

```bash
ollama pull llama3.1:8b
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
- `GET /recommendations/{cafe_slug}?cart_item_ids=id1,id2&limit=4`
  - Geçmiş sipariş sepetlerinden kurulan ürün-ürün co-occurrence matrisine
    göre, mevcut sepetle en sık birlikte alınan ürünleri önerir. Veri
    yoksa (soğuk başlangıç) aynı kategorideki ürünlere düşer.
  - `reason`: `"co_occurrence"`, `"category"` veya `"none"`.
- `POST /chat/{cafe_slug}` — body: `{"question": "...", "lang": "tr"|"en"}`
  - RAG destek asistanı: SADECE Firestore'daki menü verisinden (yapılandırılmış
    context olarak Ollama'ya verilir) cevap üretir; menüde olmayan bir bilgi
    (alerjen, kalori, popülerlik vb.) istenirse tahmin etmez, "elimde yok,
    personele sor" der.
  - Dönen veri: `{"answer": "...", "grounded": true|false, "context_item_ids": [...]}`.
    `grounded`, modelin kendi bildirdiği bir bayrak — bkz. `eval/` klasörü,
    bu bayrağın ne kadar güvenilir olduğu elle etiketlenmiş bir soru
    setiyle ölçülüyor.

## RAG değerlendirmesi (Faz 3, tez için asıl katkı)

`eval/qa_set.json` içinde TR/EN karışık, elle etiketlenmiş ~14 soruluk bir
groundedness (dayanaklılık) seti var — her soru için "bu cevaplanabilir mi
yoksa asistanın 'elimde yok' demesi mi gerekir" beklentisi işaretli.
Çalıştırmak için:

```bash
source .venv/bin/activate
python -m eval.run_eval cafe-go
```

Script her soruyu canlı asistana sorup modelin kendi bildirdiği `grounded`
bayrağını beklenen değerle karşılaştırır, bir doğruluk oranı ve
`eval/last_run_results.json` içinde detaylı bir rapor üretir. Bu, "modelin
kendi groundedness beyanı ne kadar güvenilir" sorusuna nicel bir cevap —
tam da tezin novel açısı olan TR/EN halüsinasyon/dayanaklılık ölçümü.

**Geliştirme sırasında gözlenen gerçek bir halüsinasyon örneği** (ilk
prompt taslağıyla): "En popüler tatlınız hangisi?" sorusuna model kesin
bir isim ("New York Cheesecake") verip kendi kendine `grounded: true`
işaretlemişti — oysa menü context'inde hiç popülerlik verisi yok. Prompt'a
"menüde olmayan konularda asla tahmin etme" kuralı eklenince bu düzeldi.
Bu tam olarak bu değerlendirme setinin yakalaması gereken failure mode.

**Bilinen bir sınırlama:** küçük yerel model (llama3.1:8b) bazen benzer
isimli iki ürünü (örn. "Cheesecake" / "New York Cheesecake") karıştırabiliyor
veya normal sohbet/selamlaşma mesajlarını menü sorusu gibi yorumlayabiliyor.
Bunlar prompt mühendisliğiyle tamamen ortadan kaldırılabilir değil — küçük
modellerin doğal bir sınırlaması, tez metninde "limitations" olarak
belgelenmeli, gizlenmemeli.

## Tasarım notu (SRS/tez için)
Bu servis Prophet'i "tek doğru model" olarak sunmaz; day-of-week/hour-of-day
ortalamasına dayanan basit bir baseline'a karşı **ablation** olarak sunar.
Gerekçe: bu projede uzun (aylar/yıllar) süren gerçek sipariş geçmişi
olmayacak, Prophet'in asıl gücü uzun mevsimsellik geçmişinde ortaya çıkar.
Kısa geçmişte iki modelin karşılaştırılması, hangisinin bu ölçekte daha
uygun olduğunu göstermesi bakımından daha dürüst bir sunum.
