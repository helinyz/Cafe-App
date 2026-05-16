import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
// En alta ekle ✨
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then(() => {
      console.log("SW başarıyla kaydedildi! 🎉");
    }).catch((err) => {
      console.log("SW kaydı başarısız: ", err);
    });
  });
}