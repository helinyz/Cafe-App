import { Leaf } from "lucide-react";

export default function LogoTile({ size = 52 }) {
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, borderRadius: 16, flexShrink: 0,
      background: "var(--color-sage-deep)", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 12px 24px -14px rgba(94, 107, 90, 0.9)"
    }}>
      <Leaf size={size * 0.46} strokeWidth={2} />
    </span>
  );
}
