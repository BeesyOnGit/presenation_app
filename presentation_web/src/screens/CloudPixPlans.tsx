// Generated from the Claude Design export; data-zone ids must match content/talk.json
export default function CloudPixPlans({ reveal = false }: { reveal?: boolean }) {
  return (
    <div style={{ width: "390px", height: "844px", overflow: "hidden", background: "#FFFFFF", color: "#10223A", fontFamily: "'Nunito Sans', sans-serif", display: "flex", flexDirection: "column", position: "relative" }}>
  <div style={{ height: "56px", padding: "0 18px", display: "flex", alignItems: "center", gap: "8px" }}>
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true"><path d="M9 24a6 6 0 01-.7-12A8 8 0 0124 11a6.5 6.5 0 01-1 13z" fill="#2E8BFF" /><circle cx="16" cy="17" r="3.2" fill="#FFFFFF" /></svg>
    <span style={{ fontWeight: "800", fontSize: "19px" }}>CloudPix</span>
  </div>
  <div style={{ padding: "14px 18px 0" }}>
    <div style={{ fontSize: "27px", fontWeight: "800", lineHeight: "1.15" }}>Choose your plan</div>
    <div data-zone="storage-info" style={{ marginTop: "14px", display: "flex", gap: "12px", alignItems: "center", background: "#EEF5FF", borderRadius: "14px", padding: "14px" }}>
      <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#2E8BFF", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "14px" }}>2 TB</div>
      <div style={{ fontSize: "14px", lineHeight: "1.45" }}>Room for about 400,000 photos. Share with up to 5 people.</div>
    </div>
  </div>
  <div style={{ padding: "20px 18px 0", display: "flex", flexDirection: "column", gap: "12px" }}>
    <div data-zone="monthly-plan" style={{ border: "1.5px solid #D5DEEA", borderRadius: "16px", padding: "18px", display: "flex", alignItems: "center", gap: "14px" }}>
      <div style={{ width: "22px", height: "22px", borderRadius: "11px", border: "2px solid #9AA8BB", boxSizing: "border-box" }}></div>
      <div style={{ flex: "1" }}><div style={{ fontWeight: "700", fontSize: "16px" }}>Monthly</div><div style={{ fontSize: "13px", color: "#5A6B82" }}>Billed every month</div></div>
      <div style={{ textAlign: "right" }}><div style={{ fontWeight: "800", fontSize: "18px" }}>€2.99</div><div style={{ fontSize: "12px", color: "#5A6B82" }}>/ month</div></div>
    </div>
    <div data-zone="yearly-plan" style={{ position: "relative", border: "2px solid #2E8BFF", background: "#F5F9FF", borderRadius: "16px", padding: "18px", display: "flex", alignItems: "center", gap: "14px" }}>
      <div style={{ width: "22px", height: "22px", borderRadius: "11px", border: "7px solid #2E8BFF", boxSizing: "border-box", background: "#FFFFFF" }}></div>
      <div style={{ flex: "1" }}><div style={{ fontWeight: "700", fontSize: "16px" }}>Yearly</div><div style={{ fontSize: "13px", color: "#5A6B82" }}>Billed once a year</div></div>
      <div style={{ textAlign: "right" }}><div style={{ fontWeight: "800", fontSize: "18px" }}>€29.99</div><div style={{ fontSize: "12px", color: "#5A6B82" }}>/ year</div></div>
      <span data-zone="save-badge" style={{ position: "absolute", top: "-12px", right: "16px", background: "#13A86B", color: "#FFFFFF", fontSize: "12px", fontWeight: "800", padding: "4px 10px", borderRadius: "999px" }}>Save 16%</span>
      {reveal && (<>
        <span style={{ position: "absolute", inset: "-8px", border: "4px dashed #E6FF4A", borderRadius: "20px", boxShadow: "0 0 0 2px #0A0C0F", pointerEvents: "none" }}></span>
        <span style={{ position: "absolute", left: "-8px", top: "-48px", whiteSpace: "nowrap", background: "#0A0C0F", color: "#E6FF4A", font: "700 12px 'JetBrains Mono', monospace", letterSpacing: "0.08em", padding: "6px 10px", borderRadius: "6px", border: "1px solid #E6FF4A" }}>DEBATE · NUDGE OR MANIPULATION?</span>
      </>)}
    </div>
  </div>
  <div style={{ marginTop: "auto", padding: "0 18px 24px", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
    <button data-zone="continue-button" style={{ width: "100%", height: "54px", border: "0", borderRadius: "14px", background: "#2E8BFF", color: "#FFFFFF", font: "800 16px 'Nunito Sans', sans-serif" }} type="button">Continue with Yearly</button>
    <a data-zone="terms-link" href="#" style={{ fontSize: "13px", color: "#5A6B82" }}>Renews automatically. Cancel anytime. Terms apply.</a>
  </div>
</div>
  )
}
