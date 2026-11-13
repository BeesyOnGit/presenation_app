// Generated from the Claude Design export; data-zone ids must match content/talk.json
export default function TravelGo({ reveal = false }: { reveal?: boolean }) {
  return (
    <div style={{ width: "390px", height: "844px", overflow: "hidden", background: "#F4F6FB", color: "#121A33", fontFamily: "'Plus Jakarta Sans', sans-serif", display: "flex", flexDirection: "column", position: "relative" }}>
  <div style={{ height: "56px", flex: "none", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1652F0", color: "#FFFFFF" }}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
    <div style={{ fontWeight: "800", fontSize: "19px", letterSpacing: "-0.02em" }}>travel<span style={{ color: "#FFC83D" }}>go</span></div>
    <div style={{ fontSize: "12px", fontWeight: "600", opacity: "0.9" }}>3 / 3</div>
  </div>
  <div style={{ height: "50px", flex: "none", padding: "0 16px", display: "flex", alignItems: "center", fontSize: "20px", fontWeight: "800" }}>Review and pay</div>

  <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
    <div data-zone="flight-card" style={{ height: "140px", boxSizing: "border-box", background: "#FFFFFF", borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between", border: "1px solid #E3E8F3" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#5C6785", fontWeight: "600" }}><span>Fri 12 Dec · Direct</span><span>Economy Light</span></div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div><div style={{ fontSize: "26px", fontWeight: "800" }}>CDG</div><div style={{ fontSize: "13px", color: "#5C6785" }}>Paris · 07:40</div></div>
        <div style={{ flex: "1", margin: "0 14px", display: "flex", alignItems: "center", gap: "6px" }}><div style={{ flex: "1", borderTop: "2px dashed #B9C3DB" }}></div><svg width="20" height="20" viewBox="0 0 24 24" fill="#1652F0" aria-hidden="true"><path d="M21 15.5v-2L13 9V4a1.5 1.5 0 00-3 0v5l-8 4.5v2l8-2.5V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-5z" /></svg><div style={{ flex: "1", borderTop: "2px dashed #B9C3DB" }}></div></div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: "26px", fontWeight: "800" }}>LIS</div><div style={{ fontSize: "13px", color: "#5C6785" }}>Lisbon · 09:20</div></div>
      </div>
      <div style={{ fontSize: "12px", color: "#5C6785" }}>2 h 40 min · 1 cabin bag included</div>
    </div>
    <div style={{ background: "#FFFFFF", borderRadius: "16px", border: "1px solid #E3E8F3" }}>
      <div data-zone="passenger" style={{ height: "60px", boxSizing: "border-box", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #EEF1F7" }}>
        <div><div style={{ fontSize: "12px", color: "#5C6785" }}>Passenger</div><div style={{ fontSize: "15px", fontWeight: "700" }}>Alex Martin</div></div>
        <span style={{ fontSize: "13px", color: "#1652F0", fontWeight: "700" }}>Edit</span>
      </div>
      <div data-zone="seat" style={{ height: "60px", boxSizing: "border-box", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div><div style={{ fontSize: "12px", color: "#5C6785" }}>Seat</div><div style={{ fontSize: "15px", fontWeight: "700" }}>14C · Aisle</div></div>
        <span style={{ fontSize: "15px", fontWeight: "700" }}>€25.00</span>
      </div>
    </div>
    <div data-zone="travel-protection" style={{ position: "relative", height: "74px", boxSizing: "border-box", background: "#FFFFFF", borderRadius: "16px", border: "1px solid #E3E8F3", padding: "0 16px", display: "flex", alignItems: "center", gap: "12px" }}>
      <div style={{ width: "22px", height: "22px", flex: "none", borderRadius: "6px", background: "#1652F0", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg></div>
      <div style={{ flex: "1" }}><div style={{ fontSize: "14px", fontWeight: "700" }}>Add travel protection</div><div style={{ fontSize: "12px", color: "#5C6785" }}>Cancellation and delay cover</div></div>
      <span style={{ fontSize: "15px", fontWeight: "700" }}>€12.99</span>
      {reveal && (<>
        <span style={{ position: "absolute", inset: "-6px", border: "4px solid #E6FF4A", borderRadius: "20px", boxShadow: "0 0 0 2px #0A0C0F, 0 0 28px 8px rgba(230,255,74,0.6)", pointerEvents: "none" }}></span>
        <span style={{ position: "absolute", left: "-6px", top: "-40px", whiteSpace: "nowrap", background: "#0A0C0F", color: "#E6FF4A", font: "700 12px 'JetBrains Mono', monospace", letterSpacing: "0.08em", padding: "6px 10px", borderRadius: "6px", border: "1px solid #E6FF4A" }}>PATTERN · PRESELECTION</span>
      </>)}
    </div>
    <div data-zone="price-breakdown" style={{ background: "#FFFFFF", borderRadius: "16px", border: "1px solid #E3E8F3", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#5C6785" }}>Fare</span><span>€164.00</span></div>
      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#5C6785" }}>Seat 14C</span><span>€25.00</span></div>
      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#5C6785" }}>Travel protection</span><span>€12.99</span></div>
      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #EEF1F7", paddingTop: "10px", fontWeight: "800", fontSize: "17px" }}><span>Total</span><span>€201.99</span></div>
    </div>
  </div>
  <div style={{ marginTop: "auto", padding: "14px 16px 22px", background: "#FFFFFF", borderTop: "1px solid #E3E8F3" }}>
    <button data-zone="pay-button" style={{ width: "100%", height: "54px", border: "0", borderRadius: "14px", background: "#FFC83D", color: "#121A33", font: "800 16px 'Plus Jakarta Sans', sans-serif" }} type="button">Pay €201.99</button>
    <div style={{ textAlign: "center", fontSize: "11px", color: "#5C6785", marginTop: "8px" }}>Secure payment · Prices include taxes and fees</div>
  </div>
</div>
  )
}
