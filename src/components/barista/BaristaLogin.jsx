import LogoTile from "./LogoTile";

const etiketStili = { display: "block", margin: "0 0 6px 4px", fontSize: 13, fontWeight: 700, color: "var(--color-text)" };
const alanStili = {
  width: "100%", height: 52, boxSizing: "border-box", padding: "0 18px", borderRadius: "var(--radius-button)",
  border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)", fontSize: 15, outline: "none"
};

// Giriş mantığı (signInWithEmailAndPassword) BaristaPage'de; burada sadece form.
export default function BaristaLogin({ onSubmit, hata }) {
  return (
    <main className="flora-panel" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={onSubmit} style={{
        width: "100%", maxWidth: 380, padding: 32, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16,
        background: "var(--color-surface)", borderRadius: "var(--radius-column)", border: "1px solid var(--color-border-soft)", boxShadow: "var(--shadow-soft)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <LogoTile size={46} />
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 1.4, color: "var(--color-sage-deep)", textTransform: "uppercase" }}>Flora Cafe</p>
            <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 600 }}>Barista girişi</h1>
          </div>
        </div>
        <div>
          <label htmlFor="barista-email" style={etiketStili}>E-posta</label>
          <input id="barista-email" name="email" type="email" autoComplete="username" required style={alanStili} />
        </div>
        <div>
          <label htmlFor="barista-sifre" style={etiketStili}>Şifre</label>
          <input id="barista-sifre" name="password" type="password" autoComplete="current-password" required style={alanStili} />
        </div>
        {hata && <p role="alert" style={{ margin: 0, padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 600, background: "var(--color-danger-bg)", color: "var(--color-danger-text)" }}>{hata}</p>}
        <button type="submit" className="flora-tap" style={{
          height: 52, borderRadius: "var(--radius-button)", border: "none", cursor: "pointer",
          background: "var(--color-terracotta)", color: "#fff", fontSize: 16, fontWeight: 700, boxShadow: "var(--shadow-cta)"
        }}>
          Giriş yap
        </button>
      </form>
    </main>
  );
}
