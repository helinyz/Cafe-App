// Dekoratif organik "blob" şekli — hero ve sipariş onayı başlığında,
// bilinçli olarak seyrek kullanılıyor (bkz. tasarım planı).
export default function Blob({ color = "var(--color-sage)", opacity = 0.4, style }) {
  return (
    <svg viewBox="-100 -100 200 200" aria-hidden="true" style={style}>
      <path
        fill={color}
        opacity={opacity}
        d="M39.7,-56.7C50.4,-49.2,57.4,-35.5,60.6,-21.1C63.8,-6.7,63.2,8.4,57.6,21.4C52,34.4,41.4,45.3,28.5,52.6C15.6,59.9,0.4,63.6,-14.7,61.6C-29.8,59.6,-44.8,51.9,-54.4,39.8C-64,27.7,-68.2,11.2,-67.1,-4.7C-66,-20.6,-59.6,-35.9,-48.5,-44.4C-37.4,-52.9,-21.6,-54.6,-6.3,-56.6C9,-58.6,29,-64.2,39.7,-56.7Z"
      />
    </svg>
  );
}
