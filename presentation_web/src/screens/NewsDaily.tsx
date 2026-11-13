// Generated from the Claude Design export; data-zone ids must match content/talk.json
export default function NewsDaily({ reveal = false }: { reveal?: boolean }) {
  return (
    <div style={{ width: "390px", height: "844px", overflow: "hidden", background: "#FFFFFF", color: "#111111", fontFamily: "'Libre Franklin', sans-serif", position: "relative" }}>
  <div data-zone="masthead" style={{ height: "64px", borderBottom: "3px double #111111", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
    <svg style={{ position: "absolute", left: "16px" }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
    <div style={{ fontFamily: "'Source Serif 4', serif", fontWeight: "700", fontSize: "28px", letterSpacing: "-0.01em" }}>The NewsDaily</div>
  </div>
  <div data-zone="article" style={{ padding: "18px 18px 0" }}>
    <div style={{ fontSize: "12px", fontWeight: "700", color: "#A3122A", letterSpacing: "0.08em" }}>CLIMATE</div>
    <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: "27px", fontWeight: "600", lineHeight: "1.15", marginTop: "6px" }}>Coastal towns test floating flood barriers ahead of winter storms</div>
    <div style={{ fontSize: "12px", color: "#595959", marginTop: "10px" }}>By Lena Okafor · 6 min read</div>
    <div style={{ height: "180px", borderRadius: "4px", background: "#C9D6DF", marginTop: "14px", position: "relative", overflow: "hidden" }}><div style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: "70px", background: "#7D9BB0" }}></div><div style={{ position: "absolute", left: "40px", bottom: "50px", width: "220px", height: "26px", background: "#E0B04A", borderRadius: "4px" }}></div></div>
    <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: "17px", lineHeight: "1.6", marginTop: "14px" }}>For decades the town's sea wall held. Then the storms got stronger, and the council started looking at something that floats.</div>
  </div>
  <div style={{ position: "absolute", inset: "0", background: "rgba(17,17,17,0.5)" }}></div>

  <div style={{ position: "absolute", left: "20px", right: "20px", top: "196px", background: "#FFFFFF", borderRadius: "6px", padding: "26px 22px 20px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "0 20px 50px rgba(0,0,0,0.35)" }}>
    <svg style={{ position: "absolute", top: "14px", right: "14px" }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    <div data-zone="brief-title">
      <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.1em", color: "#A3122A" }}>FREE · EVERY WEEKDAY</div>
      <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: "28px", fontWeight: "700", lineHeight: "1.1", marginTop: "6px" }}>Get the morning brief</div>
      <div style={{ fontSize: "14px", color: "#444444", lineHeight: "1.5", marginTop: "8px" }}>Five stories that matter, in your inbox by 7 a.m.</div>
    </div>
    <label data-zone="email-field" style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: "600", color: "#444444" }}>Email address
      <input type="email" placeholder="you@example.com" style={{ height: "48px", border: "1px solid #BDBDBD", borderRadius: "4px", padding: "0 12px", font: "400 16px 'Libre Franklin', sans-serif" }} readOnly tabIndex={-1} />
    </label>
    <button data-zone="subscribe-button" style={{ height: "50px", border: "0", borderRadius: "4px", background: "#111111", color: "#FFFFFF", font: "700 16px 'Libre Franklin', sans-serif" }} type="button">Subscribe</button>
    <div style={{ display: "flex", justifyContent: "center" }}>
      <a data-zone="decline-link" href="#" style={{ position: "relative", fontSize: "13px", color: "#595959", textDecoration: "underline", padding: "4px" }}>No thanks, I prefer being uninformed
        {reveal && (<>
          <span style={{ position: "absolute", inset: "-6px", border: "4px solid #E6FF4A", borderRadius: "10px", boxShadow: "0 0 0 2px #0A0C0F, 0 0 28px 8px rgba(230,255,74,0.6)", pointerEvents: "none" }}></span>
          <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: "40px", whiteSpace: "nowrap", background: "#0A0C0F", color: "#E6FF4A", font: "700 12px 'JetBrains Mono', monospace", letterSpacing: "0.08em", padding: "6px 10px", borderRadius: "6px", border: "1px solid #E6FF4A" }}>PATTERN · CONFIRMSHAMING</span>
        </>)}
      </a>
    </div>
    <div data-zone="fine-print" style={{ fontSize: "11px", color: "#6B6B6B", textAlign: "center", lineHeight: "1.5" }}>Unsubscribe anytime. See our privacy notice.</div>
  </div>
</div>
  )
}
