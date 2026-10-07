import { useEffect, useState } from "react";

// CSS media query'nin JS tarafındaki karşılığı (örn. panonun 1024px altında
// sütunlardan sekmelere geçmesi için).
export default function useMediaQuery(sorgu) {
  const [eslesiyor, setEslesiyor] = useState(() => window.matchMedia(sorgu).matches);
  useEffect(() => {
    const mql = window.matchMedia(sorgu);
    const degisti = (e) => setEslesiyor(e.matches);
    mql.addEventListener("change", degisti);
    return () => mql.removeEventListener("change", degisti);
  }, [sorgu]);
  return eslesiyor;
}
