const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

exports.notifyBarista = onRequest({ cors: true }, async (req, res) => {
  // 1. Güvenlik ve Metot Kontrolü
  if (req.method !== "POST") {
    return res.status(405).send({ error: "Sadece POST metodu desteklenmektedir aşkım!" });
  }

  const { token, tableNumber, cafeName } = req.body;

  // 2. Veri Doğrulama
  if (!token) {
    logger.error("Bildirim gönderilemedi: Token eksik.");
    return res.status(400).send({ error: "Token gerekli!" });
  }

  const payload = {
    token: token,
    notification: {
      title: "☕ Siparişiniz Hazır!",
      body: `${cafeName || "Flora Cafe"} — Masa ${tableNumber || "?"} siparişiniz hazırlandı. Afiyet olsun!`,
    },
    // Android/iOS için ekstra özelleştirme (opsiyonel)
    android: {
      priority: "high",
      notification: {
        sound: "default",
        clickAction: "FLUTTER_NOTIFICATION_CLICK", // Eğer mobil app kullanıyorsan
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
        },
      },
    },
  };

  try {
    // 3. Bildirimi Gönder
    const response = await admin.messaging().send(payload);
    logger.info("Bildirim başarıyla gönderildi:", response);
    
    return res.status(200).json({ 
      success: true, 
      messageId: response 
    });
    
  } catch (error) {
    logger.error("FCM Bildirim Hatası:", error);
    
    // Token geçersizse veya süresi dolmuşsa özel hata dönebilirsin
    if (error.code === 'messaging/registration-token-not-registered') {
      return res.status(410).send({ error: "Token artık geçerli değil." });
    }

    return res.status(500).send({ 
      error: "Bildirim gönderilemedi.",
      details: error.message 
    });
  }
});