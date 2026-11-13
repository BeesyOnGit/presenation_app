// Generated from the Claude Design export; data-zone ids must match content/talk.json
export default function CloudPixCancel({ reveal = false }: { reveal?: boolean }) {
  return (
    <div style={{ width: "390px", height: "844px", overflow: "hidden", background: "#FFFFFF", color: "#10223A", fontFamily: "'Nunito Sans', sans-serif", display: "flex", flexDirection: "column", position: "relative" }}>
  <div style={{ height: "56px", padding: "0 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true"><path d="M9 24a6 6 0 01-.7-12A8 8 0 0124 11a6.5 6.5 0 01-1 13z" fill="#2E8BFF" /><circle cx="16" cy="17" r="3.2" fill="#FFFFFF" /></svg>
      <span style={{ fontWeight: "800", fontSize: "19px" }}>CloudPix</span>
    </div>
  </div>
  <div data-zone="step-indicator" style={{ position: "relative", margin: "4px 18px 0", display: "flex", alignItems: "center", gap: "10px" }}>
    <div style={{ flex: "1", display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "4px" }}>
      <div style={{ height: "4px", borderRadius: "2px", background: "#2E8BFF" }}></div><div style={{ height: "4px", borderRadius: "2px", background: "#2E8BFF" }}></div><div style={{ height: "4px", borderRadius: "2px", background: "#2E8BFF" }}></div><div style={{ height: "4px", borderRadius: "2px", background: "#2E8BFF" }}></div><div style={{ height: "4px", borderRadius: "2px", background: "#D5DEEA" }}></div>
    </div>
    <span style={{ fontSize: "12px", color: "#5A6B82", fontWeight: "600" }}>Step 4 of 5</span>
    {reveal && (<>
      <span style={{ position: "absolute", inset: "-8px", border: "4px solid #E6FF4A", borderRadius: "12px", boxShadow: "0 0 0 2px #0A0C0F, 0 0 28px 8px rgba(230,255,74,0.6)", pointerEvents: "none" }}></span>
      <span style={{ position: "absolute", right: "-8px", top: "26px", whiteSpace: "nowrap", background: "#0A0C0F", color: "#E6FF4A", font: "700 12px 'JetBrains Mono', monospace", letterSpacing: "0.08em", padding: "6px 10px", borderRadius: "6px", border: "1px solid #E6FF4A" }}>PATTERN · OBSTRUCTION</span>
    </>)}
  </div>
  <div style={{ padding: "26px 18px 0", display: "flex", flexDirection: "column", gap: "16px" }}>
    <div style={{ fontSize: "27px", fontWeight: "800", lineHeight: "1.15" }}>Before you go…</div>
    <div data-zone="memories-card" style={{ borderRadius: "16px", background: "#EEF5FF", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "6px" }}>
        <div style={{ height: "64px", borderRadius: "8px", background: "#F2B880" }}></div><div style={{ height: "64px", borderRadius: "8px", background: "#7FB7A4" }}></div><div style={{ height: "64px", borderRadius: "8px", background: "#A99BE0" }}></div><div style={{ height: "64px", borderRadius: "8px", background: "#E98A8A" }}></div>
      </div>
      <div style={{ fontSize: "15px", lineHeight: "1.45" }}>You have <b>12,408 photos</b> and <b>316 videos</b> in your 2 TB.</div>
    </div>
    <div data-zone="offer-card" style={{ borderRadius: "16px", border: "1.5px dashed #2E8BFF", padding: "14px 16px", fontSize: "14px", lineHeight: "1.45" }}>
      <b style={{ color: "#2E8BFF" }}>Stay for €1.49/month</b> for the next 3 months. Applied automatically if you keep your plan.
    </div>
    <label data-zone="double-negative" style={{ position: "relative", display: "flex", gap: "12px", alignItems: "flex-start", fontSize: "14px", lineHeight: "1.45", color: "#34465E", padding: "4px 0" }}>
      <span style={{ width: "20px", height: "20px", flex: "none", border: "2px solid #9AA8BB", borderRadius: "5px", boxSizing: "border-box", marginTop: "1px", background: "#FFFFFF" }}></span>
      <span>Don't not delete my photos after cancelling</span>
      {reveal && (<>
        <span style={{ position: "absolute", inset: "-8px", border: "4px solid #E6FF4A", borderRadius: "12px", boxShadow: "0 0 0 2px #0A0C0F, 0 0 28px 8px rgba(230,255,74,0.6)", pointerEvents: "none" }}></span>
        <span style={{ position: "absolute", left: "-8px", top: "40px", whiteSpace: "nowrap", background: "#0A0C0F", color: "#E6FF4A", font: "700 12px 'JetBrains Mono', monospace", letterSpacing: "0.08em", padding: "6px 10px", borderRadius: "6px", border: "1px solid #E6FF4A" }}>PATTERN · TRICK WORDING</span>
      </>)}
    </label>
  </div>
  <div style={{ marginTop: "auto", padding: "0 18px 24px", display: "flex", flexDirection: "column", gap: "14px", alignItems: "center" }}>
    <button data-zone="keep-plan" style={{ width: "100%", height: "56px", border: "0", borderRadius: "14px", background: "#2E8BFF", color: "#FFFFFF", font: "800 17px 'Nunito Sans', sans-serif" }} type="button">Keep my 2 TB</button>
    <a data-zone="continue-cancelling" href="#" style={{ fontSize: "12px", color: "#8592A6", textDecoration: "none" }}>Continue cancelling</a>
  </div>
</div>
  )
}
