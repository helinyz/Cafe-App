import { BrowserRouter, Routes, Route } from "react-router-dom";
import CustomerPage from "./pages/CustomerPage";
import BaristaPage from "./pages/BaristaPage";
import OwnerPage from "./pages/OwnerPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Yeni URL Yapısı: /siparis/kafe-ismi ✨ */}
        <Route path="/siparis/:cafeSlug" element={<CustomerPage />} />
        
        <Route path="/panel/barista" element={<BaristaPage />} />
        <Route path="/panel/owner" element={<OwnerPage />} />
        <Route path="*" element={<div style={{ padding: 20 }}>Sayfa bulunamadı!</div>} />
      </Routes>
    </BrowserRouter>
  );
}