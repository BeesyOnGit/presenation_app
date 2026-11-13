// Generated from the Claude Design export; data-zone ids must match content/talk.json
export default function StreamBox({ reveal = false }: { reveal?: boolean }) {
  return (
    <div style={{ width: "390px", height: "844px", overflow: "hidden", background: "#0D0B16", color: "#FFFFFF", fontFamily: "Outfit, sans-serif", position: "relative" }}>
  <div style={{ position: "absolute", inset: "0", filter: "blur(7px)", opacity: "0.85" }}>
    <div style={{ height: "60px", display: "flex", alignItems: "center", padding: "0 18px", gap: "10px" }}><div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#7C5CFF" }}></div><div style={{ width: "110px", height: "14px", borderRadius: "7px", background: "#3A3550" }}></div></div>
    <div style={{ margin: "0 18px", height: "300px", borderRadius: "18px", background: "#3B2A7A", position: "relative" }}>
      <div style={{ position: "absolute", left: "22px", bottom: "26px", width: "200px", height: "26px", borderRadius: "8px", background: "#E9E4FF" }}></div>
      <div style={{ position: "absolute", left: "22px", bottom: "64px", width: "120px", height: "12px", borderRadius: "6px", background: "#9C8BFF" }}></div>
      <div style={{ position: "absolute", right: "30px", top: "40px", width: "120px", height: "120px", borderRadius: "60px", background: "#FF8A5B" }}></div>
    </div>
    <div style={{ display: "flex", gap: "12px", padding: "22px 18px 0" }}>
      <div style={{ width: "120px", height: "170px", borderRadius: "12px", background: "#1F6F78" }}></div>
      <div style={{ width: "120px", height: "170px", borderRadius: "12px", background: "#8A2E5C" }}></div>
      <div style={{ width: "120px", height: "170px", borderRadius: "12px", background: "#5A4A1F" }}></div>
    </div>
    <div style={{ display: "flex", gap: "12px", padding: "22px 18px 0" }}>
      <div style={{ width: "170px", height: "100px", borderRadius: "12px", background: "#23304F" }}></div>
      <div style={{ width: "170px", height: "100px", borderRadius: "12px", background: "#3D2342" }}></div>
    </div>
  </div>
  <div style={{ position: "absolute", inset: "0", background: "rgba(8,6,16,0.55)" }}></div>

  <div style={{ position: "absolute", left: "14px", right: "14px", bottom: "18px", background: "#FFFFFF", color: "#17142A", borderRadius: "22px", padding: "26px 22px 18px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
    <div data-zone="brand-logo" style={{ position: "relative", display: "flex", alignItems: "center", gap: "8px", alignSelf: "flex-start" }}>
      <div style={{ width: "26px", height: "26px", borderRadius: "7px", background: "#7C5CFF", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5l7 4.5-7 4.5z" fill="#FFFFFF" /></svg></div>
      <span style={{ fontWeight: "700", fontSize: "18px", letterSpacing: "-0.01em" }}>StreamBox</span>
    </div>
    <div data-zone="modal-title" style={{ fontSize: "23px", fontWeight: "600", lineHeight: "1.2" }}>We care about your viewing experience</div>
    <div data-zone="privacy-text" style={{ fontSize: "14px", lineHeight: "1.5", color: "#5B5770" }}>We and our 214 partners use cookies to personalise recommendations, measure performance and show you relevant ads. You can change your choice at any time.</div>
    <a data-zone="privacy-policy" href="#" style={{ fontSize: "14px", color: "#6A4FF0", fontWeight: "500", textDecoration: "underline" }}>Read our privacy policy</a>
    <button data-zone="accept-all" style={{ position: "relative", marginTop: "6px", height: "56px", border: "0", borderRadius: "14px", background: "#7C5CFF", color: "#FFFFFF", font: "600 17px Outfit, sans-serif" }} type="button">Accept all and continue
      {reveal && (<><span style={{ position: "absolute", inset: "-6px", border: "4px solid #E6FF4A", borderRadius: "18px", boxShadow: "0 0 0 2px #0A0C0F, 0 0 28px 8px rgba(230,255,74,0.6)", pointerEvents: "none" }}></span></>)}
    </button>
    <div style={{ display: "flex", justifyContent: "center" }}>
      <a data-zone="manage-options" href="#" style={{ position: "relative", fontSize: "11px", color: "#B9B6C6", textDecoration: "none", padding: "4px 6px" }}>Manage options
        {reveal && (<>
          <span style={{ position: "absolute", inset: "-6px", border: "4px solid #E6FF4A", borderRadius: "10px", boxShadow: "0 0 0 2px #0A0C0F, 0 0 28px 8px rgba(230,255,74,0.6)", pointerEvents: "none" }}></span>
          <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: "-42px", whiteSpace: "nowrap", background: "#0A0C0F", color: "#E6FF4A", font: "700 12px 'JetBrains Mono', monospace", letterSpacing: "0.08em", padding: "6px 10px", borderRadius: "6px", border: "1px solid #E6FF4A" }}>PATTERN · VISUAL INTERFERENCE</span>
        </>)}
      </a>
    </div>
  </div>
</div>
  )
}
