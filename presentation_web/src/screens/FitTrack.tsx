// Generated from the Claude Design export; data-zone ids must match content/talk.json
export default function FitTrack({ reveal = false }: { reveal?: boolean }) {
  return (
    <div style={{ width: "390px", height: "844px", overflow: "hidden", background: "#F3F6F5", color: "#0F1F1B", fontFamily: "Manrope, sans-serif", display: "flex", flexDirection: "column", position: "relative" }}>
  <div style={{ height: "58px", padding: "0 16px", display: "flex", alignItems: "center", gap: "12px", background: "#FFFFFF", borderBottom: "1px solid #E1E8E5" }}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F1F1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
    <div style={{ fontWeight: "700", fontSize: "17px" }}>Subscription</div>
  </div>
  <div style={{ padding: "18px 16px", display: "flex", flexDirection: "column", gap: "14px" }}>
    <div data-zone="plan-card" style={{ borderRadius: "18px", background: "#0F3D33", color: "#FFFFFF", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "9px", background: "#2FD39B", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F3D33" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12h4l3-7 4 14 3-7h4" /></svg></div>
          <span style={{ fontWeight: "800", fontSize: "16px" }}>FitTrack Plus</span>
        </div>
        <span style={{ fontSize: "12px", fontWeight: "700", background: "rgba(47,211,155,0.2)", color: "#7FF0C6", padding: "5px 10px", borderRadius: "999px" }}>Active</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}><span style={{ fontSize: "34px", fontWeight: "800" }}>€9.99</span><span style={{ fontSize: "14px", color: "#A9CFC3" }}>per month</span></div>
      <div style={{ fontSize: "13px", color: "#CDE5DD", lineHeight: "1.5" }}>Unlimited workouts, coaching plans and sleep insights.</div>
    </div>
    <div style={{ background: "#FFFFFF", borderRadius: "16px", border: "1px solid #E1E8E5" }}>
      <div data-zone="renewal-date" style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #EEF2F0" }}>
        <div><div style={{ fontSize: "13px", color: "#5D6F69" }}>Next renewal</div><div style={{ fontSize: "16px", fontWeight: "700", marginTop: "2px" }}>4 December 2026</div></div>
        <div style={{ fontSize: "13px", color: "#5D6F69", textAlign: "right" }}>You'll be charged<br /><b style={{ color: "#0F1F1B" }}>€9.99</b></div>
      </div>
      <div data-zone="payment-method" style={{ padding: "16px", display: "flex", gap: "12px", alignItems: "center", borderBottom: "1px solid #EEF2F0" }}>
        <div style={{ width: "42px", height: "28px", borderRadius: "6px", background: "#1F2A44", display: "flex", alignItems: "flex-end", padding: "5px", boxSizing: "border-box" }}><div style={{ width: "12px", height: "8px", borderRadius: "2px", background: "#E7C46B" }}></div></div>
        <div style={{ flex: "1" }}><div style={{ fontSize: "15px", fontWeight: "600" }}>Card ending 4421</div><div style={{ fontSize: "13px", color: "#5D6F69" }}>Expires 08/28</div></div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5D6F69" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
      </div>
      <div data-zone="billing-history" style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "15px", fontWeight: "600" }}>Billing history</div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5D6F69" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
      </div>
    </div>
    <div style={{ fontSize: "13px", color: "#5D6F69", lineHeight: "1.5", padding: "0 4px" }}>Cancel any time. You keep Plus until the end of the period you've paid for.</div>
  </div>
  <div style={{ marginTop: "auto", padding: "16px 16px 14px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
    <button data-zone="change-plan" style={{ height: "52px", borderRadius: "14px", border: "1.5px solid #0F3D33", background: "#FFFFFF", color: "#0F3D33", font: "700 15px Manrope, sans-serif" }} type="button">Change plan</button>
    <button data-zone="cancel-subscription" style={{ height: "52px", borderRadius: "14px", border: "1.5px solid #0F3D33", background: "#FFFFFF", color: "#0F3D33", font: "700 15px Manrope, sans-serif" }} type="button">Cancel subscription</button>
  </div>
  <div style={{ padding: "0 16px 22px", textAlign: "center" }}>
    <a data-zone="help-link" href="#" style={{ fontSize: "14px", color: "#0F7A5E", fontWeight: "600" }}>Need help? Contact support</a>
  </div>
  {reveal && (<>
    <div style={{ position: "absolute", inset: "0", border: "6px solid #E6FF4A", boxShadow: "inset 0 0 40px rgba(230,255,74,0.45)", pointerEvents: "none" }}></div>
    <div style={{ position: "absolute", top: "70px", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", background: "#0A0C0F", color: "#E6FF4A", font: "700 13px 'JetBrains Mono', monospace", letterSpacing: "0.08em", padding: "8px 12px", borderRadius: "6px", border: "1px solid #E6FF4A" }}>CLEAN · NO PATTERN HERE</div>
  </>)}
</div>
  )
}
