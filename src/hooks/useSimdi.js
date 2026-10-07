import { useEffect, useState } from "react";

// Belirli aralıklarla güncellenen "şu an" (ms). Geçen süre pilleri
// dakikada bir kendini yenilesin diye.
export default function useSimdi(aralikMs = 30000) {
  const [simdi, setSimdi] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setSimdi(Date.now()), aralikMs);
    return () => clearInterval(timer);
  }, [aralikMs]);
  return simdi;
}
