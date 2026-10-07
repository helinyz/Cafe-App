// Kısa bir bildirim "bip"i (müşteri: sipariş hazır, barista: yeni sipariş) — dosya eklemeden
// Web Audio API ile üretiliyor. Tarayıcı ses politikaları nedeniyle
// başarısız olabilir (örn. hiç kullanıcı etkileşimi olmadan), bu yüzden
// sessizce yutuluyor — ses olmasa da görsel banner zaten gösteriliyor.
export function playBildirimSesi() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // ses çalınamadı, sorun değil
  }
}
