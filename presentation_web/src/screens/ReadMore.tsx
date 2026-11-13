// Generated from the Claude Design export; data-zone ids must match content/talk.json
export default function ReadMore({ reveal = false }: { reveal?: boolean }) {
  return (
    <div style={{ width: "390px", height: "844px", overflow: "hidden", background: "#FFF8F0", color: "#1D2440", fontFamily: "'Work Sans', sans-serif", display: "flex", flexDirection: "column", position: "relative" }}>
  <div style={{ height: "56px", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <div style={{ fontFamily: "Literata, serif", fontWeight: "700", fontSize: "22px" }}>read<span style={{ color: "#E2603B" }}>more</span></div>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D2440" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
  </div>
  <div data-zone="book-art" style={{ height: "200px", margin: "4px 20px 0", borderRadius: "20px", background: "#1D2440", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "12px", paddingBottom: "26px", boxSizing: "border-box" }}>
    <div style={{ width: "66px", height: "104px", borderRadius: "4px 8px 8px 4px", background: "#E2603B", transform: "rotate(-8deg)" }}></div>
    <div style={{ width: "74px", height: "120px", borderRadius: "4px 8px 8px 4px", background: "#F2C14E" }}></div>
    <div style={{ width: "66px", height: "100px", borderRadius: "4px 8px 8px 4px", background: "#7FB7A4", transform: "rotate(7deg)" }}></div>
  </div>
  <div style={{ padding: "22px 20px 0", display: "flex", flexDirection: "column", gap: "14px" }}>
    <div style={{ fontFamily: "Literata, serif", fontSize: "28px", fontWeight: "700", lineHeight: "1.15" }}>Start your free week of reading</div>
    <div data-zone="trial-price" style={{ fontSize: "17px", lineHeight: "1.45" }}>7 days free, then <b>€8.99/month</b></div>
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div data-zone="reminder-note" style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "15px", lineHeight: "1.45" }}>
        <svg style={{ flex: "none", marginTop: "2px" }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E2603B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 004 0" /></svg>
        <span>We'll remind you 2 days before your trial ends</span>
      </div>
      <div data-zone="cancel-note" style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "15px", lineHeight: "1.45" }}>
        <svg style={{ flex: "none", marginTop: "2px" }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E2603B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
        <span>Cancel anytime in Settings in 2 taps</span>
      </div>
    </div>
    <label data-zone="email-field" style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "600", marginTop: "4px" }}>Email
      <input type="email" placeholder="you@example.com" style={{ height: "50px", border: "1.5px solid #D9CFC2", borderRadius: "12px", background: "#FFFFFF", padding: "0 14px", font: "400 16px 'Work Sans', sans-serif" }} readOnly tabIndex={-1} />
    </label>
  </div>
  <div style={{ marginTop: "auto", padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: "14px", alignItems: "center" }}>
    <button data-zone="start-trial" style={{ width: "100%", height: "54px", border: "0", borderRadius: "14px", background: "#E2603B", color: "#FFFFFF", font: "700 16px 'Work Sans', sans-serif" }} type="button">Start free trial</button>
    <a data-zone="sign-in-link" href="#" style={{ fontSize: "14px", color: "#1D2440" }}>Already have an account? <b>Sign in</b></a>
  </div>
  {reveal && (<>
    <div style={{ position: "absolute", inset: "0", border: "6px solid #E6FF4A", boxShadow: "inset 0 0 40px rgba(230,255,74,0.45)", pointerEvents: "none" }}></div>
    <div style={{ position: "absolute", top: "66px", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", background: "#0A0C0F", color: "#E6FF4A", font: "700 13px 'JetBrains Mono', monospace", letterSpacing: "0.08em", padding: "8px 12px", borderRadius: "6px", border: "1px solid #E6FF4A" }}>CLEAN · NO PATTERN HERE</div>
  </>)}
</div>
  )
}
